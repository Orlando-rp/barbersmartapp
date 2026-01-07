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
    // Client identification
    existingClient?: { id: string; name: string; preferredName?: string; email?: string };
    isClientConfirmed?: boolean;
    // Payment
    paymentMethod?: 'online' | 'at_location';
    paymentAmount?: number;
    paymentUrl?: string;
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

  // Use external Supabase (nmsblmmhigwsevnqmhwn) for data operations
  const EXTERNAL_SUPABASE_URL = 'https://nmsblmmhigwsevnqmhwn.supabase.co';
  const externalServiceKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabase = createClient(EXTERNAL_SUPABASE_URL, externalServiceKey);

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

    // Check if context expired (30 minutes)
    const contextAge = Date.now() - (context as any).lastActivity;
    if (contextAge > 30 * 60 * 1000) {
      context = {
        barbershopId,
        clientPhone: from,
        step: 'initial',
        data: {}
      };
    }
    (context as any).lastActivity = Date.now();

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

    // Handle client confirmation flow
    if (context.step === 'awaiting_client_confirmation') {
      const confirmResult = await handleClientConfirmation(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (confirmResult.handled) {
        conversations.set(conversationKey, confirmResult.context);
        await logConversation(supabase, barbershopId, from, message, confirmResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: confirmResult.response,
            context: confirmResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle client name input flow
    if (context.step === 'awaiting_client_name') {
      const nameResult = await handleClientNameInput(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (nameResult.handled) {
        conversations.set(conversationKey, nameResult.context);
        await logConversation(supabase, barbershopId, from, message, nameResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: nameResult.response,
            context: nameResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle payment choice flow
    if (context.step === 'awaiting_payment_choice') {
      const paymentResult = await handlePaymentChoice(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (paymentResult.handled) {
        conversations.set(conversationKey, paymentResult.context);
        await logConversation(supabase, barbershopId, from, message, paymentResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: paymentResult.response,
            context: paymentResult.context.step
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle final confirmation flow
    if (context.step === 'awaiting_final_confirmation') {
      const confirmResult = await handleFinalConfirmation(supabase, context, message, from, barbershopId, instanceName, apiUrl, apiKey);
      if (confirmResult.handled) {
        conversations.set(conversationKey, confirmResult.context);
        await logConversation(supabase, barbershopId, from, message, confirmResult.response);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: confirmResult.response,
            context: confirmResult.context.step
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
      context = await handleAction(supabase, context, aiResponse.action, services || [], staffList, barbershop, instanceName, apiUrl, apiKey);
      conversations.set(conversationKey, context);
    }

    // Check if we need to transition to client identification after datetime selection
    if (context.step === 'datetime_selected' && context.data.date && context.data.time) {
      const identifyResult = await identifyClientAndAsk(supabase, context, from, barbershopId, instanceName, apiUrl, apiKey);
      context = identifyResult.context;
      conversations.set(conversationKey, context);
      await logConversation(supabase, barbershopId, from, message, identifyResult.response);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: identifyResult.response,
          context: context.step
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

// Identify client by phone and ask for confirmation
async function identifyClientAndAsk(
  supabase: any,
  context: ConversationContext,
  phone: string,
  barbershopId: string,
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<{ response: string; context: ConversationContext }> {
  const newContext = { ...context, data: { ...context.data } };
  
  // Clean phone for search
  let searchPhone = phone.replace(/\D/g, '');
  if (searchPhone.startsWith('55')) {
    searchPhone = searchPhone.substring(2);
  }
  const lastDigits = searchPhone.slice(-9);

  // Search for existing client
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, name, preferred_name, email')
    .eq('barbershop_id', barbershopId)
    .eq('active', true)
    .or(`phone.ilike.%${lastDigits}`)
    .maybeSingle();

  let response: string;

  if (existingClient) {
    const displayName = existingClient.preferred_name || existingClient.name;
    newContext.data.existingClient = {
      id: existingClient.id,
      name: existingClient.name,
      preferredName: existingClient.preferred_name,
      email: existingClient.email
    };
    newContext.step = 'awaiting_client_confirmation';
    
    response = `📱 Encontrei um cadastro com este número!\n\n👤 *${displayName}*\n\nEste agendamento é para você?\nResponda *SIM* ou informe o nome de quem será atendido.`;
  } else {
    newContext.step = 'awaiting_client_name';
    response = `👤 Qual o nome de quem será atendido?`;
  }

  if (instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, phone, response, barbershopId, supabase);
  }

  return { response, context: newContext };
}

// Handle client confirmation response
async function handleClientConfirmation(
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
  const trimmed = message.trim().toLowerCase();
  
  const isConfirm = ['sim', 's', 'yes', 'y', 'confirmo', 'sou eu', 'eu', 'isso'].includes(trimmed);
  
  let response: string;
  
  if (isConfirm && context.data.existingClient) {
    newContext.data.isClientConfirmed = true;
    newContext.data.clientName = context.data.existingClient.preferredName || context.data.existingClient.name;
    
    // Proceed to payment options
    const paymentResult = await askPaymentOption(supabase, newContext, from, barbershopId, instanceName, apiUrl, apiKey);
    return { handled: true, response: paymentResult.response, context: paymentResult.context };
  } else {
    // Client provided a different name
    newContext.data.clientName = message.trim();
    newContext.data.isClientConfirmed = true;
    
    // Proceed to payment options
    const paymentResult = await askPaymentOption(supabase, newContext, from, barbershopId, instanceName, apiUrl, apiKey);
    return { handled: true, response: paymentResult.response, context: paymentResult.context };
  }
}

// Handle client name input
async function handleClientNameInput(
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
  
  const name = message.trim();
  if (name.length < 2) {
    const response = 'Por favor, informe um nome válido.';
    if (instanceName && apiUrl) {
      await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
    }
    return { handled: true, response, context: newContext };
  }
  
  newContext.data.clientName = name;
  newContext.data.isClientConfirmed = true;
  
  // Proceed to payment options
  const paymentResult = await askPaymentOption(supabase, newContext, from, barbershopId, instanceName, apiUrl, apiKey);
  return { handled: true, response: paymentResult.response, context: paymentResult.context };
}

// Ask for payment option
async function askPaymentOption(
  supabase: any,
  context: ConversationContext,
  from: string,
  barbershopId: string,
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<{ response: string; context: ConversationContext }> {
  const newContext = { ...context, data: { ...context.data } };
  
  // Get payment settings
  const { data: settings } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .maybeSingle();

  const servicePrice = context.data.service?.price || 0;
  let response: string;

  // If no settings or only at_location allowed
  if (!settings || !settings.allow_online_payment) {
    newContext.data.paymentMethod = 'at_location';
    newContext.step = 'awaiting_final_confirmation';
    response = buildConfirmationMessage(newContext);
  }
  // If only online allowed
  else if (!settings.allow_pay_at_location) {
    newContext.data.paymentMethod = 'online';
    newContext.step = 'awaiting_final_confirmation';
    
    const depositInfo = settings.require_deposit 
      ? `Sinal de ${settings.deposit_percentage}% será cobrado` 
      : 'Pagamento integral online';
    response = `💳 *Pagamento Online*\n${depositInfo}\n\n` + buildConfirmationMessage(newContext);
  }
  // Both options available
  else {
    newContext.step = 'awaiting_payment_choice';
    
    let depositText = '';
    if (settings.require_deposit && settings.deposit_percentage) {
      const depositValue = (servicePrice * settings.deposit_percentage / 100).toFixed(2);
      depositText = `Sinal de R$ ${depositValue} (${settings.deposit_percentage}%)`;
    } else {
      depositText = `R$ ${servicePrice.toFixed(2)}`;
    }
    
    response = `💳 *Como deseja pagar?*\n\n` +
      `1️⃣ *Pagar Agora (Online)*\n` +
      `   ${depositText}\n` +
      `   PIX, Cartão ou Boleto\n\n` +
      `2️⃣ *Pagar no Local*\n` +
      `   Pague quando chegar\n\n` +
      `Responda *1* ou *2*`;
  }

  if (instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
  }

  return { response, context: newContext };
}

// Handle payment choice
async function handlePaymentChoice(
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
  const trimmed = message.trim();
  
  let response: string;
  
  if (trimmed === '1' || trimmed.toLowerCase().includes('online') || trimmed.toLowerCase().includes('agora') || trimmed.toLowerCase().includes('pix')) {
    newContext.data.paymentMethod = 'online';
    newContext.step = 'awaiting_final_confirmation';
    response = buildConfirmationMessage(newContext);
  } else if (trimmed === '2' || trimmed.toLowerCase().includes('local') || trimmed.toLowerCase().includes('lá') || trimmed.toLowerCase().includes('chegando')) {
    newContext.data.paymentMethod = 'at_location';
    newContext.step = 'awaiting_final_confirmation';
    response = buildConfirmationMessage(newContext);
  } else {
    response = `Por favor, responda:\n• *1* para pagar online agora\n• *2* para pagar no local`;
    if (instanceName && apiUrl) {
      await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
    }
    return { handled: true, response, context: newContext };
  }

  if (instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
  }

  return { handled: true, response, context: newContext };
}

// Build confirmation message
function buildConfirmationMessage(context: ConversationContext): string {
  const service = context.data.service;
  const staff = context.data.staff;
  const date = context.data.date;
  const time = context.data.time;
  const clientName = context.data.clientName;
  const paymentMethod = context.data.paymentMethod;

  // Format date
  let formattedDate = date || '';
  if (date) {
    try {
      const [year, month, day] = date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      formattedDate = `${weekdays[dateObj.getDay()]}, ${day}/${month}`;
    } catch {
      formattedDate = date;
    }
  }

  const paymentText = paymentMethod === 'online' ? '💳 Pagamento Online' : '💵 Pagamento no Local';

  return `📋 *Confirme seu agendamento:*\n\n` +
    `✂️ ${service?.name || 'Serviço'} - R$ ${service?.price?.toFixed(2) || '0.00'}\n` +
    `👤 ${staff?.name || 'Qualquer profissional'}\n` +
    `📅 ${formattedDate} às ${time}\n` +
    `${paymentText}\n\n` +
    `👤 Cliente: *${clientName}*\n\n` +
    `Confirma? Responda *SIM* para finalizar ou *NÃO* para cancelar.`;
}

// Handle final confirmation
async function handleFinalConfirmation(
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
  const trimmed = message.trim().toLowerCase();
  
  const isConfirm = ['sim', 's', 'yes', 'y', 'confirmo', 'confirmar', 'ok'].includes(trimmed);
  const isCancel = ['não', 'nao', 'n', 'no', 'cancelar', 'cancela'].includes(trimmed);
  
  let response: string;

  if (isConfirm) {
    // Create the appointment
    const createResult = await createAppointment(supabase, newContext, from, barbershopId);
    
    if (createResult.success) {
      // If online payment, generate payment link
      if (newContext.data.paymentMethod === 'online') {
        const paymentResult = await initiatePayment(supabase, barbershopId, createResult.appointmentId!, newContext);
        
        if (paymentResult?.paymentUrl) {
          response = `✅ *Agendamento criado!*\n\n` +
            `📌 Código: #${createResult.appointmentId?.slice(0, 8)}\n\n` +
            `💳 *Complete o pagamento:*\n${paymentResult.paymentUrl}\n\n` +
            `Após o pagamento, seu agendamento será confirmado automaticamente! ✅\n\n` +
            `Aguardamos você! 💈`;
        } else {
          response = `✅ *Agendamento confirmado!*\n\n` +
            `📌 Código: #${createResult.appointmentId?.slice(0, 8)}\n\n` +
            `⚠️ Não foi possível gerar o link de pagamento. Por favor, pague no local ou entre em contato.\n\n` +
            `Aguardamos você! 💈`;
        }
      } else {
        response = `✅ *Agendamento confirmado!*\n\n` +
          `📌 Código: #${createResult.appointmentId?.slice(0, 8)}\n\n` +
          `💵 Pagamento: No local\n\n` +
          `Enviaremos um lembrete antes do horário.\nAguardamos você! 💈`;
      }
      
      // Reset context
      newContext.step = 'initial';
      newContext.data = {};
    } else {
      response = `❌ Desculpe, houve um erro ao criar o agendamento.\nPor favor, tente novamente ou entre em contato conosco.`;
    }
  } else if (isCancel) {
    response = `Agendamento cancelado. Se precisar, é só me chamar! 👋`;
    newContext.step = 'initial';
    newContext.data = {};
  } else {
    response = `Por favor, responda:\n• *SIM* para confirmar\n• *NÃO* para cancelar`;
    if (instanceName && apiUrl) {
      await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
    }
    return { handled: true, response, context: newContext };
  }

  if (instanceName && apiUrl) {
    await sendWhatsAppMessage(apiUrl, apiKey, instanceName, from, response, barbershopId, supabase);
  }

  return { handled: true, response, context: newContext };
}

// Create appointment in database
async function createAppointment(
  supabase: any,
  context: ConversationContext,
  phone: string,
  barbershopId: string
): Promise<{ success: boolean; appointmentId?: string }> {
  try {
    const { service, staff, date, time, clientName, existingClient, paymentMethod } = context.data;
    
    if (!service || !date || !time || !clientName) {
      console.error('[Chatbot] Missing required data for appointment');
      return { success: false };
    }

    // Get or create client
    let clientId = existingClient?.id;
    
    if (!clientId) {
      // Clean phone
      let cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
        cleanPhone = '55' + cleanPhone;
      }
      
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          barbershop_id: barbershopId,
          name: clientName,
          phone: cleanPhone,
          active: true
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('[Chatbot] Error creating client:', clientError);
        return { success: false };
      }
      clientId = newClient.id;
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: barbershopId,
        client_id: clientId,
        staff_id: staff?.id,
        service_id: service.id,
        appointment_date: date,
        appointment_time: time,
        duration: service.duration || 30,
        status: 'agendado',
        client_name: clientName,
        client_phone: phone,
        service_name: service.name,
        service_price: service.price,
        payment_method_chosen: paymentMethod || 'at_location',
        payment_status: 'pending'
      })
      .select('id')
      .single();

    if (appointmentError) {
      console.error('[Chatbot] Error creating appointment:', appointmentError);
      return { success: false };
    }

    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    console.error('[Chatbot] Create appointment error:', error);
    return { success: false };
  }
}

// Initiate online payment
async function initiatePayment(
  supabase: any,
  barbershopId: string,
  appointmentId: string,
  context: ConversationContext
): Promise<{ paymentUrl?: string; amount?: number } | null> {
  try {
    const { service, clientName } = context.data;
    
    const { data, error } = await supabase.functions.invoke('create-payment-preference', {
      body: {
        appointmentId,
        barbershopId,
        serviceName: service?.name,
        servicePrice: service?.price,
        clientName,
        clientPhone: context.clientPhone
      }
    });

    if (error) {
      console.error('[Chatbot] Payment preference error:', error);
      return null;
    }

    return {
      paymentUrl: data?.init_point || data?.paymentUrl || data?.invoiceUrl,
      amount: data?.amount || service?.price
    };
  } catch (error) {
    console.error('[Chatbot] Initiate payment error:', error);
    return null;
  }
}

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
    
    const { data: appointment } = await supabase
      .from('appointments')
      .select('client_id, staff_id')
      .eq('id', appointmentId)
      .single();

    if (appointment) {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, preferred_name')
        .eq('barbershop_id', barbershopId)
        .eq('phone', from)
        .maybeSingle();

      const displayName = client?.preferred_name || client?.name || 'Cliente via WhatsApp';

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          barbershop_id: barbershopId,
          appointment_id: appointmentId,
          client_id: client?.id || appointment.client_id,
          staff_id: appointment.staff_id,
          rating,
          comment
        });

      if (reviewError) {
        console.error('[Chatbot] Error saving review:', reviewError);
        response = 'Desculpe, houve um erro ao salvar sua avaliação. Por favor, tente novamente mais tarde.';
      } else {
        response = `✅ Obrigado pela sua avaliação!\n\n${comment ? 'Seu comentário foi registrado. ' : ''}Agradecemos o feedback e esperamos vê-lo novamente em breve! 💈`;
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
  const trimmedMessage = message.trim();
  if (!/^[1-3]$/.test(trimmedMessage)) {
    return { isRescheduleResponse: false };
  }

  let searchPhone = phone.replace(/\D/g, '');
  if (searchPhone.startsWith('55')) {
    searchPhone = searchPhone.substring(2);
  }

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

// Handle reschedule flow
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

  if (context.step === 'awaiting_reschedule_confirmation') {
    const isConfirm = ['sim', 's', 'confirmar', 'confirmo', 'ok', 'yes', '1'].includes(trimmedMessage);
    const isCancel = ['não', 'nao', 'n', 'cancelar', 'no', '2'].includes(trimmedMessage);

    if (isConfirm) {
      const selectedSlot = context.data.rescheduleSelectedSlot;
      const newAppointmentId = context.data.rescheduleNewAppointmentId;

      if (selectedSlot && newAppointmentId) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'confirmado' })
          .eq('id', newAppointmentId);

        if (updateError) {
          console.error('[Chatbot] Error confirming appointment:', updateError);
          response = 'Desculpe, houve um erro ao confirmar. Mas seu horário está reservado! 💈';
        } else {
          const { data: barbershop } = await supabase
            .from('barbershops')
            .select('name')
            .eq('id', barbershopId)
            .single();

          response = `✅ *Confirmado!*\n\nSeu agendamento para ${selectedSlot.formatted} está confirmado!\n\nEsperamos você! 💈\n\n_${barbershop?.name || 'Barbearia'}_`;

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

      newContext.step = 'initial';
      newContext.data = {};
    } else if (isCancel) {
      const newAppointmentId = context.data.rescheduleNewAppointmentId;

      if (newAppointmentId) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelado', notes: 'Cliente recusou confirmação via WhatsApp' })
          .eq('id', newAppointmentId);

        console.log(`[Chatbot] Client declined reschedule appointment ${newAppointmentId}`);
      }

      response = `Tudo bem! O agendamento foi cancelado.\n\nSe quiser agendar outro horário, é só me chamar! 💈`;
      newContext.step = 'initial';
      newContext.data = {};
    } else {
      response = `Por favor, responda:\n• *SIM* para confirmar o agendamento\n• *NÃO* para cancelar`;
    }
  } 
  else if (context.step === 'awaiting_reschedule_choice') {
    const slotIndex = parseInt(trimmedMessage) - 1;
    const slots = context.data.rescheduleSlots || [];
    
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) {
      response = `Por favor, responda com um número válido (1 a ${slots.length}) para escolher o horário desejado.`;
    } else {
      const selectedSlot = slots[slotIndex];
      const appointmentId = context.data.rescheduleAppointmentId;
      
      try {
        const { data: originalAppointment } = await supabase
          .from('appointments')
          .select(`*, clients!inner (id, name, phone, preferred_name), services (id, name, price, duration)`)
          .eq('id', appointmentId)
          .single();
        
        if (!originalAppointment) {
          response = 'Desculpe, não encontramos o agendamento original. Por favor, entre em contato com a barbearia.';
          newContext.step = 'initial';
          newContext.data = {};
        } else {
          const { data: newAppointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
              barbershop_id: barbershopId,
              client_id: originalAppointment.client_id,
              staff_id: originalAppointment.staff_id,
              service_id: originalAppointment.service_id,
              appointment_date: selectedSlot.date,
              appointment_time: selectedSlot.time,
              duration: originalAppointment.duration || originalAppointment.services?.duration || 30,
              status: 'agendado',
              notes: `Reagendamento automático (no-show de ${originalAppointment.appointment_date}) - Aguardando confirmação`,
            })
            .select()
            .single();
          
          if (appointmentError || !newAppointment) {
            console.error('[Chatbot] Error creating reschedule appointment:', appointmentError);
            response = 'Desculpe, houve um erro ao criar o reagendamento. Por favor, entre em contato com a barbearia.';
            newContext.step = 'initial';
            newContext.data = {};
          } else {
            await supabase
              .from('appointments')
              .update({ 
                notes: `${originalAppointment.notes || ''}\nReagendado para ${selectedSlot.formatted}`.trim(),
              })
              .eq('id', appointmentId);
            
            const { data: barbershop } = await supabase
              .from('barbershops')
              .select('name')
              .eq('id', barbershopId)
              .single();
            
            const clientName = originalAppointment.clients?.preferred_name || originalAppointment.clients?.name?.split(' ')[0] || 'Cliente';
            const serviceName = originalAppointment.services?.name || 'serviço';
            
            response = `Ótimo, ${clientName}! 🎉\n\nReservamos o seguinte horário para você:\n\n📅 *${selectedSlot.formatted}*\n✂️ ${serviceName}\n\n📍 ${barbershop?.name || 'Barbearia'}\n\n*Deseja confirmar este agendamento?*\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`;
            
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
4. **IMPORTANTE**: Após escolher data/hora, o sistema automaticamente:
   - Identificará o cliente pelo telefone
   - Perguntará se o agendamento é para ele
   - Oferecerá opções de pagamento
5. NÃO pergunte o nome do cliente diretamente - o sistema fará isso

FORMATO DE RESPOSTA (JSON):
{
  "response": "sua mensagem para o cliente",
  "action": {
    "type": "select_service|select_staff|select_datetime|none",
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
      return { response: '', error: true };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('[Chatbot] AI response:', content);

    try {
      const parsed = JSON.parse(content);
      return {
        response: parsed.response || 'Desculpe, não entendi. Pode repetir?',
        action: parsed.action
      };
    } catch {
      return { response: content };
    }

  } catch (error) {
    console.error('[Chatbot] OpenAI call failed:', error);
    return { response: '', error: true };
  }
}

async function handleAction(
  supabase: any,
  context: ConversationContext,
  action: any,
  services: any[],
  staff: any[],
  barbershop: any,
  instanceName: string,
  apiUrl: string,
  apiKey: string
): Promise<ConversationContext> {
  const newContext = { ...context, data: { ...context.data } };

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
    console.log('[Chatbot] Could not log conversation:', error);
  }
}
