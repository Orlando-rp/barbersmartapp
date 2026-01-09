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
    // Review data
    reviewAppointmentId?: string;
    reviewRating?: number;
    // Reschedule data
    rescheduleAppointmentId?: string;
    rescheduleSlots?: { date: string; time: string; formatted: string }[];
    rescheduleSelectedSlot?: { date: string; time: string; formatted: string };
    rescheduleNewAppointmentId?: string;
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

  try {
    const { 
      message, 
      from, 
      barbershopId,
      instanceName,
      apiUrl,
      apiKey,
      // For review flow - appointment ID to review
      appointmentId,
      reviewMode
    } = await req.json();

    console.log(`[Chatbot] Message from ${from}: ${message}`);

    if (!message || !from || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Initialize review mode if triggered
    if (reviewMode && appointmentId) {
      context.step = 'awaiting_rating';
      context.data.reviewAppointmentId = appointmentId;
      conversations.set(conversationKey, context);
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

    // Handle review flow separately (simpler, no AI needed)
    if (context.step === 'awaiting_rating' || context.step === 'awaiting_comment') {
      const reviewResult = await handleReviewFlow(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (reviewResult.handled) {
        conversations.set(conversationKey, reviewResult.context);
        
        // Log the conversation
        await logConversation(supabase, barbershopId, from, message, reviewResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: reviewResult.response,
            context: reviewResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle reschedule flow (when client responds with slot number or confirmation)
    if (context.step === 'awaiting_reschedule_choice' || context.step === 'awaiting_reschedule_confirmation') {
      const rescheduleResult = await handleRescheduleFlow(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (rescheduleResult.handled) {
        conversations.set(conversationKey, rescheduleResult.context);
        
        // Log the conversation
        await logConversation(supabase, barbershopId, from, message, rescheduleResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: rescheduleResult.response,
            context: rescheduleResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for reschedule response (numbers 1, 2, or 3) from recent no-show suggestions
    const rescheduleCheck = await checkForRescheduleResponse(supabase, message, from, barbershopId);
    if (rescheduleCheck.isRescheduleResponse) {
      context.step = 'awaiting_reschedule_choice';
      context.data.rescheduleAppointmentId = rescheduleCheck.appointmentId;
      context.data.rescheduleSlots = rescheduleCheck.suggestedSlots;
      conversations.set(conversationKey, context);
      
      const rescheduleResult = await handleRescheduleFlow(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (rescheduleResult.handled) {
        conversations.set(conversationKey, rescheduleResult.context);
        await logConversation(supabase, barbershopId, from, message, rescheduleResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: rescheduleResult.response,
            context: rescheduleResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if OpenAI API key is configured (only needed for non-review flows)
    if (!openaiApiKey) {
      console.error('[Chatbot] OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

// Handle review flow without AI
async function handleReviewFlow(
  supabase: any,
  context: ConversationContext,
  message: string,
  from: string,
  barbershopId: string,
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<{ handled: boolean; response: string; context: ConversationContext }> {
  const newContext = { ...context, data: { ...context.data } };
  let response = '';
  let handled = true;

  if (context.step === 'awaiting_rating') {
    // Try to parse rating from message
    const ratingMatch = message.match(/[1-5]/);
    
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[0]);
      newContext.data.reviewRating = rating;
      newContext.step = 'awaiting_comment';
      
      const stars = '⭐'.repeat(rating);
      response = `${stars} Obrigado pela nota ${rating}!\n\nDeseja deixar um comentário sobre o atendimento? (responda com seu comentário ou envie "não" para finalizar)`;
    } else {
      response = 'Por favor, responda com uma nota de 1 a 5:\n\n1 ⭐ - Muito ruim\n2 ⭐⭐ - Ruim\n3 ⭐⭐⭐ - Regular\n4 ⭐⭐⭐⭐ - Bom\n5 ⭐⭐⭐⭐⭐ - Excelente';
    }
  } else if (context.step === 'awaiting_comment') {
    const rating = context.data.reviewRating || 5;
    const appointmentId = context.data.reviewAppointmentId;
    const comment = message.toLowerCase() === 'não' || message.toLowerCase() === 'nao' ? null : message;
    
    // Get appointment details to save review
    const { data: appointment } = await supabase
      .from('appointments')
      .select('client_id, staff_id')
      .eq('id', appointmentId)
      .single();

    if (appointment) {
      // Get client name from phone
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, preferred_name')
        .eq('barbershop_id', barbershopId)
        .eq('phone', from)
        .maybeSingle();

      // Use preferred_name if available
      const displayName = client?.preferred_name || client?.name || 'Cliente via WhatsApp';

      // Save review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          barbershop_id: barbershopId,
          appointment_id: appointmentId,
          client_id: client?.id || appointment.client_id,
          staff_id: appointment.staff_id,
          rating,
          comment,
          client_name: displayName
        });

      if (reviewError) {
        console.error('[Chatbot] Error saving review:', reviewError);
        response = 'Desculpe, houve um erro ao salvar sua avaliação. Por favor, tente novamente mais tarde.';
      } else {
        response = `✅ Obrigado pela sua avaliação!\n\n${comment ? 'Seu comentário foi registrado. ' : ''}Agradecemos o feedback e esperamos vê-lo novamente em breve! 💈`;
        
        // Reset context
        newContext.step = 'initial';
        newContext.data = {};
      }
    } else {
      response = 'Desculpe, não encontramos o agendamento para avaliar. Por favor, entre em contato com a barbearia.';
      newContext.step = 'initial';
      newContext.data = {};
    }
  } else {
    handled = false;
  }

  // Send response if handled
  if (handled && response && instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
  }

  return { handled, response, context: newContext };
}

// Check if incoming message is a response to a reschedule suggestion
async function checkForRescheduleResponse(
  supabase: any,
  message: string,
  phone: string,
  barbershopId: string
): Promise<{ isRescheduleResponse: boolean; appointmentId?: string; suggestedSlots?: any[] }> {
  // Check if message is a simple number (1, 2, or 3)
  const trimmedMessage = message.trim();
  if (!/^[1-3]$/.test(trimmedMessage)) {
    return { isRescheduleResponse: false };
  }

  // Format phone for search
  let searchPhone = phone.replace(/\D/g, '');
  if (searchPhone.startsWith('55')) {
    searchPhone = searchPhone.substring(2);
  }

  // Look for recent no_show_reschedule log sent to this phone (within last 24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentLogs } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('message_type', 'no_show_reschedule')
    .eq('status', 'sent')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentLogs || recentLogs.length === 0) {
    return { isRescheduleResponse: false };
  }

  // Find log matching this phone
  const matchingLog = recentLogs.find((log: any) => {
    const logPhone = (log.phone || log.recipient_phone || '').replace(/\D/g, '');
    return logPhone.includes(searchPhone) || searchPhone.includes(logPhone);
  });

  if (!matchingLog || !matchingLog.metadata?.suggested_slots) {
    return { isRescheduleResponse: false };
  }

  return {
    isRescheduleResponse: true,
    appointmentId: matchingLog.metadata.appointment_id,
    suggestedSlots: matchingLog.metadata.suggested_slots,
  };
}

// Handle reschedule flow - now with confirmation step
async function handleRescheduleFlow(
  supabase: any,
  context: ConversationContext,
  message: string,
  from: string,
  barbershopId: string,
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<{ handled: boolean; response: string; context: ConversationContext }> {
  const newContext = { ...context, data: { ...context.data } };
  let response = '';
  let handled = true;

  const trimmedMessage = message.trim().toLowerCase();

  // Step 2: Handle confirmation response
  if (context.step === 'awaiting_reschedule_confirmation') {
    const isConfirm = ['sim', 's', 'confirmar', 'confirmo', 'ok', 'yes', '1'].includes(trimmedMessage);
    const isCancel = ['não', 'nao', 'n', 'cancelar', 'no', '2'].includes(trimmedMessage);

    if (isConfirm) {
      const selectedSlot = context.data.rescheduleSelectedSlot;
      const newAppointmentId = context.data.rescheduleNewAppointmentId;

      if (selectedSlot && newAppointmentId) {
        // Confirm the appointment by changing status
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'confirmado' })
          .eq('id', newAppointmentId);

        if (updateError) {
          console.error('[Chatbot] Error confirming appointment:', updateError);
          response = 'Desculpe, houve um erro ao confirmar. Mas seu horário está reservado! 💈';
        } else {
          // Get barbershop name
          const { data: barbershop } = await supabase
            .from('barbershops')
            .select('name')
            .eq('id', barbershopId)
            .single();

          response = `✅ *Confirmado!*

Seu agendamento para ${selectedSlot.formatted} está confirmado!

Esperamos você! 💈

_${barbershop?.name || 'Barbearia'}_`;

          // Log the confirmation
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: barbershopId,
            phone: from,
            message_type: 'reschedule_client_confirmed',
            message_content: response,
            status: 'sent',
            metadata: {
              appointment_id: newAppointmentId,
              confirmed_at: new Date().toISOString(),
            },
          });

          console.log(`[Chatbot] Client confirmed reschedule appointment ${newAppointmentId}`);
        }
      } else {
        response = 'Desculpe, não encontramos os dados do agendamento. Por favor, entre em contato com a barbearia.';
      }

      // Reset context
      newContext.step = 'initial';
      newContext.data = {};
    } else if (isCancel) {
      const newAppointmentId = context.data.rescheduleNewAppointmentId;

      if (newAppointmentId) {
        // Cancel the pending appointment
        await supabase
          .from('appointments')
          .update({ status: 'cancelado', notes: 'Cliente recusou confirmação via WhatsApp' })
          .eq('id', newAppointmentId);

        console.log(`[Chatbot] Client declined reschedule appointment ${newAppointmentId}`);
      }

      response = `Tudo bem! O agendamento foi cancelado.

Se quiser agendar outro horário, é só me chamar! 💈`;

      // Reset context
      newContext.step = 'initial';
      newContext.data = {};
    } else {
      response = `Por favor, responda:
• *SIM* para confirmar o agendamento
• *NÃO* para cancelar`;
    }
  } 
  // Step 1: Handle slot selection
  else if (context.step === 'awaiting_reschedule_choice') {
    const slotIndex = parseInt(trimmedMessage) - 1;
    const slots = context.data.rescheduleSlots || [];
    
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) {
      response = `Por favor, responda com um número válido (1 a ${slots.length}) para escolher o horário desejado.`;
    } else {
      const selectedSlot = slots[slotIndex];
      const appointmentId = context.data.rescheduleAppointmentId;
      
      try {
        // Get original appointment details
        const { data: originalAppointment } = await supabase
          .from('appointments')
          .select(`
            *,
            clients!inner (id, name, phone, preferred_name),
            services (id, name, price, duration)
          `)
          .eq('id', appointmentId)
          .single();
        
        if (!originalAppointment) {
          response = 'Desculpe, não encontramos o agendamento original. Por favor, entre em contato com a barbearia.';
          newContext.step = 'initial';
          newContext.data = {};
        } else {
          // Create new appointment with status 'agendado' (pending confirmation)
          const { data: newAppointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
              barbershop_id: barbershopId,
              client_id: originalAppointment.client_id,
              staff_id: originalAppointment.staff_id,
              service_id: originalAppointment.service_id,
              date: selectedSlot.date,
              time: selectedSlot.time,
              duration: originalAppointment.duration || originalAppointment.services?.duration || 30,
              status: 'agendado',
              notes: `Reagendamento automático (no-show de ${originalAppointment.date}) - Aguardando confirmação`,
            })
            .select()
            .single();
          
          if (appointmentError || !newAppointment) {
            console.error('[Chatbot] Error creating reschedule appointment:', appointmentError);
            response = 'Desculpe, houve um erro ao criar o reagendamento. Por favor, entre em contato com a barbearia.';
            newContext.step = 'initial';
            newContext.data = {};
          } else {
            // Update original appointment to mark it was rescheduled
            await supabase
              .from('appointments')
              .update({ 
                notes: `${originalAppointment.notes || ''}\nReagendado para ${selectedSlot.formatted}`.trim(),
              })
              .eq('id', appointmentId);
            
            // Get barbershop name
            const { data: barbershop } = await supabase
              .from('barbershops')
              .select('name')
              .eq('id', barbershopId)
              .single();
            
            const clientName = originalAppointment.clients?.preferred_name || originalAppointment.clients?.name?.split(' ')[0] || 'Cliente';
            const serviceName = originalAppointment.services?.name || 'serviço';
            
            response = `Ótimo, ${clientName}! 🎉

Reservamos o seguinte horário para você:

📅 *${selectedSlot.formatted}*
✂️ ${serviceName}

📍 ${barbershop?.name || 'Barbearia'}

*Deseja confirmar este agendamento?*
Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
            
            // Log the reschedule creation (pending confirmation)
            await supabase.from('whatsapp_logs').insert({
              barbershop_id: barbershopId,
              phone: from,
              message_type: 'reschedule_pending_confirmation',
              message_content: response,
              status: 'sent',
              metadata: {
                original_appointment_id: appointmentId,
                new_appointment_id: newAppointment.id,
                new_date: selectedSlot.date,
                new_time: selectedSlot.time,
              },
            });
            
            // Update context for confirmation step
            newContext.step = 'awaiting_reschedule_confirmation';
            newContext.data.rescheduleSelectedSlot = selectedSlot;
            newContext.data.rescheduleNewAppointmentId = newAppointment.id;
            
            console.log(`[Chatbot] Created pending reschedule appointment ${newAppointment.id}, awaiting confirmation`);
          }
        }
      } catch (error) {
        console.error('[Chatbot] Error in reschedule flow:', error);
        response = 'Desculpe, houve um erro. Por favor, entre em contato com a barbearia.';
        newContext.step = 'initial';
        newContext.data = {};
      }
    }
  }
  
  // Send response
  if (handled && response && instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
  }
  
  return { handled, response, context: newContext };
}

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
