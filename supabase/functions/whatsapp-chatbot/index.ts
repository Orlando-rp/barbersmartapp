import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationContext {
  barbershopId: string;
  clientPhone: string;
  step: string;
  data: {
    service?: { id: string; name: string; duration: number; price: number };
    staff?: { id: string; name: string };
    date?: string;
    time?: string;
    clientName?: string;
  };
}

// In-memory conversation store (in production, use Redis or database)
const conversations = new Map<string, ConversationContext>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if OpenAI API key is configured
  if (!openaiApiKey) {
    console.error('[Chatbot] OPENAI_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { 
      message, 
      from, 
      barbershopId,
      instanceName,
      apiUrl,
      apiKey
    } = await req.json();

    console.log(`[Chatbot] Message from ${from}: ${message}`);

    if (!message || !from || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get barbershop info
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .single();

    if (!barbershop) {
      return new Response(
        JSON.stringify({ error: 'Barbershop not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create conversation context
    const conversationKey = `${barbershopId}:${from}`;
    let context = conversations.get(conversationKey) || {
      barbershopId,
      clientPhone: from,
      step: 'initial',
      data: {}
    };

    // Get available services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration, price')
      .eq('barbershop_id', barbershopId)
      .eq('active', true);

    // Get available staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id, profiles!staff_user_id_fkey(full_name)')
      .eq('barbershop_id', barbershopId)
      .eq('active', true);

    const staffList = staff?.map(s => ({
      id: s.id,
      name: s.profiles?.full_name || 'Profissional'
    })) || [];

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(barbershop, services || [], staffList, context);

    // Call OpenAI to understand intent and generate response
    const aiResponse = await callOpenAI(openaiApiKey, systemPrompt, message, context);
    
    // If there was an error, don't send any message to avoid loops
    if (aiResponse.error || !aiResponse.response) {
      console.log('[Chatbot] Skipping response due to error or empty response');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate response',
          context: context.step
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update conversation context based on AI response
    if (aiResponse.action) {
      context = await handleAction(supabase, context, aiResponse.action, services || [], staffList);
      conversations.set(conversationKey, context);
    }

    // Send response via WhatsApp
    const responseMessage = aiResponse.response;
    
    if (instanceName && apiUrl && responseMessage) {
      await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, responseMessage, barbershopId, supabase);
    }

    // Log the conversation
    await logConversation(supabase, barbershopId, from, message, responseMessage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: responseMessage,
        context: context.step
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Chatbot] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(
  barbershop: any, 
  services: any[], 
  staff: any[], 
  context: ConversationContext
): string {
  const servicesList = services.map(s => 
    `- ${s.name}: R$ ${s.price.toFixed(2)} (${s.duration} minutos)`
  ).join('\n');

  const staffList = staff.map(s => `- ${s.name}`).join('\n');

  const currentStep = context.step;
  const currentData = JSON.stringify(context.data);

  return `Você é um assistente virtual da barbearia "${barbershop.name}". 
Seu objetivo é ajudar clientes a agendar, reagendar ou cancelar compromissos de forma amigável e eficiente.

INFORMAÇÕES DA BARBEARIA:
- Nome: ${barbershop.name}
- Endereço: ${barbershop.address || 'Não informado'}
- Telefone: ${barbershop.phone || 'Não informado'}

SERVIÇOS DISPONÍVEIS:
${servicesList || 'Nenhum serviço cadastrado'}

PROFISSIONAIS DISPONÍVEIS:
${staffList || 'Nenhum profissional cadastrado'}

ESTADO ATUAL DA CONVERSA:
- Etapa: ${currentStep}
- Dados coletados: ${currentData}

REGRAS:
1. Seja sempre educado e profissional
2. Use português brasileiro informal mas respeitoso
3. Responda de forma concisa (máximo 3 frases quando possível)
4. Guie o cliente pelo processo de agendamento passo a passo
5. Confirme cada informação antes de prosseguir
6. Se o cliente quiser cancelar, peça confirmação
7. Se o cliente mencionar um serviço ou profissional, identifique-o da lista

FLUXO DE AGENDAMENTO:
1. Cumprimentar e perguntar qual serviço deseja
2. Perguntar preferência de profissional (ou "qualquer um")
3. Sugerir datas/horários disponíveis
4. Confirmar nome do cliente
5. Confirmar todos os dados e finalizar agendamento

FORMATO DE RESPOSTA (JSON):
{
  "response": "sua mensagem para o cliente",
  "action": {
    "type": "select_service|select_staff|select_datetime|confirm_name|create_appointment|cancel_appointment|none",
    "data": { dados relevantes }
  }
}

Sempre responda APENAS com o JSON válido, sem texto adicional.`;
}

async function callOpenAI(
  apiKey: string, 
  systemPrompt: string, 
  userMessage: string,
  context: ConversationContext
): Promise<{ response: string; action?: any; error?: boolean }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chatbot] OpenAI API error status:', response.status);
      console.error('[Chatbot] OpenAI API error body:', errorText);
      
      // Parse error for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[Chatbot] OpenAI error type:', errorJson.error?.type);
        console.error('[Chatbot] OpenAI error message:', errorJson.error?.message);
      } catch {
        // Ignore parse error
      }
      
      return { response: '', error: true };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('[Chatbot] AI response:', content);

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        response: parsed.response || 'Desculpe, não entendi. Pode repetir?',
        action: parsed.action
      };
    } catch {
      // If not valid JSON, use content as response
      return { response: content };
    }

  } catch (error) {
    console.error('[Chatbot] OpenAI call failed:', error);
    // Return null to indicate we should NOT send a response (to avoid loops)
    return { 
      response: '',
      error: true
    };
  }
}

async function handleAction(
  supabase: any,
  context: ConversationContext,
  action: any,
  services: any[],
  staff: any[]
): Promise<ConversationContext> {
  const newContext = { ...context };

  switch (action.type) {
    case 'select_service':
      if (action.data?.serviceName) {
        const service = services.find(s => 
          s.name.toLowerCase().includes(action.data.serviceName.toLowerCase())
        );
        if (service) {
          newContext.data.service = service;
          newContext.step = 'service_selected';
        }
      }
      break;

    case 'select_staff':
      if (action.data?.staffName) {
        const selectedStaff = staff.find(s => 
          s.name.toLowerCase().includes(action.data.staffName.toLowerCase())
        );
        if (selectedStaff) {
          newContext.data.staff = selectedStaff;
          newContext.step = 'staff_selected';
        }
      } else if (action.data?.anyStaff) {
        // Random staff selection
        if (staff.length > 0) {
          newContext.data.staff = staff[Math.floor(Math.random() * staff.length)];
          newContext.step = 'staff_selected';
        }
      }
      break;

    case 'select_datetime':
      if (action.data?.date) {
        newContext.data.date = action.data.date;
      }
      if (action.data?.time) {
        newContext.data.time = action.data.time;
      }
      if (newContext.data.date && newContext.data.time) {
        newContext.step = 'datetime_selected';
      }
      break;

    case 'confirm_name':
      if (action.data?.clientName) {
        newContext.data.clientName = action.data.clientName;
        newContext.step = 'name_confirmed';
      }
      break;

    case 'create_appointment':
      if (newContext.data.service && newContext.data.staff && 
          newContext.data.date && newContext.data.time && newContext.data.clientName) {
        
        // Check if client exists or create new
        let clientId: string;
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', context.barbershopId)
          .eq('phone', context.clientPhone)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              barbershop_id: context.barbershopId,
              name: newContext.data.clientName,
              phone: context.clientPhone,
              active: true
            })
            .select('id')
            .single();

          if (clientError) {
            console.error('[Chatbot] Error creating client:', clientError);
            break;
          }
          clientId = newClient.id;
        }

        // Create appointment
        const appointmentTime = `${newContext.data.date}T${newContext.data.time}:00`;
        
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            barbershop_id: context.barbershopId,
            client_id: clientId,
            staff_id: newContext.data.staff.id,
            service_id: newContext.data.service.id,
            appointment_time: appointmentTime,
            status: 'pendente',
            client_name: newContext.data.clientName,
            client_phone: context.clientPhone,
            service_name: newContext.data.service.name,
            service_price: newContext.data.service.price,
            service_duration: newContext.data.service.duration
          });

        if (appointmentError) {
          console.error('[Chatbot] Error creating appointment:', appointmentError);
        } else {
          newContext.step = 'appointment_created';
          // Clear data for new conversation
          newContext.data = {};
        }
      }
      break;

    case 'cancel_appointment':
      // Reset conversation
      newContext.step = 'initial';
      newContext.data = {};
      break;
  }

  return newContext;
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  to: string,
  message: string,
  barbershopId: string,
  supabase: any
) {
  try {
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['apikey'] = apiKey;
    }

    let formattedPhone = to.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    });

    const status = response.ok ? 'sent' : 'failed';
    
    // Log the outgoing message
    await supabase
      .from('whatsapp_logs')
      .insert({
        barbershop_id: barbershopId,
        recipient_phone: to,
        message_content: message,
        status,
        provider: 'evolution',
        message_type: 'chatbot_response'
      });

    return response.ok;
  } catch (error) {
    console.error('[Chatbot] Error sending WhatsApp:', error);
    return false;
  }
}

async function logConversation(
  supabase: any,
  barbershopId: string,
  clientPhone: string,
  userMessage: string,
  botResponse: string
) {
  try {
    await supabase
      .from('chatbot_conversations')
      .insert({
        barbershop_id: barbershopId,
        client_phone: clientPhone,
        user_message: userMessage,
        bot_response: botResponse
      });
  } catch (error) {
    // Table may not exist, just log the error
    console.log('[Chatbot] Could not log conversation:', error);
  }
}