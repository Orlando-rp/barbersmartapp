/**
 * Send Appointment Reminders via WhatsApp
 * 
 * Hierarquia de configuração:
 * 1. Configuração específica da barbearia (whatsapp_config)
 * 2. Configuração global (system_config.evolution_api + system_config.otp_whatsapp)
 * 
 * @version 2025-01-02.reminders-v3
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = '2025-01-02.reminders-v3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Function-Version': FUNCTION_VERSION
};

// ============= WhatsApp Resolver (Inline) =============

interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  source: 'barbershop' | 'global';
  barbershopId?: string;
}

function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (!formatted.startsWith('55') && formatted.length <= 11) {
    formatted = '55' + formatted;
  }
  return formatted;
}

async function checkInstanceHealth(config: WhatsAppConfig): Promise<{ connected: boolean; state: string }> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${config.instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { connected: false, state: response.status === 404 ? 'not_found' : 'error' };
    }

    const data = await response.json();
    const state = data?.state || data?.instance?.state || 'unknown';
    return { connected: state === 'open', state };
  } catch (error) {
    console.error(`[reminders] Health check error:`, error);
    return { connected: false, state: 'error' };
  }
}

async function resolveWhatsAppConfig(
  supabase: any,
  barbershopId?: string | null
): Promise<WhatsAppConfig | null> {
  console.log(`[reminders] Resolving config for barbershop: ${barbershopId || 'GLOBAL'}`);

  // 1. Tentar config específica da barbearia
  if (barbershopId) {
    const { data: bbConfig } = await supabase
      .from('whatsapp_config')
      .select('config, is_active')
      .eq('barbershop_id', barbershopId)
      .eq('provider', 'evolution')
      .eq('is_active', true)
      .maybeSingle();

    if (bbConfig?.config) {
      const cfg = bbConfig.config;
      let apiUrl = cfg.api_url;
      let apiKey = cfg.api_key;
      const instanceName = cfg.instance_name;

      // Se não tem URL/Key própria, buscar global
      if (!apiUrl || !apiKey) {
        const { data: globalEvolution } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'evolution_api')
          .maybeSingle();

        if (globalEvolution?.value) {
          apiUrl = apiUrl || globalEvolution.value.api_url;
          apiKey = apiKey || globalEvolution.value.api_key;
        }
      }

      if (apiUrl && apiKey && instanceName) {
        const config: WhatsAppConfig = { apiUrl, apiKey, instanceName, source: 'barbershop', barbershopId };
        
        // Verificar se está conectada
        const health = await checkInstanceHealth(config);
        if (health.connected) {
          console.log(`[reminders] Using barbershop config: ${instanceName}`);
          return config;
        }
        console.log(`[reminders] Barbershop instance not connected, trying global`);
      }
    }
  }

  // 2. Fallback para configuração global
  const { data: globalEvolution } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'evolution_api')
    .maybeSingle();

  const { data: globalOtp } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'otp_whatsapp')
    .maybeSingle();

  if (!globalEvolution?.value?.api_url || !globalEvolution?.value?.api_key) {
    console.log(`[reminders] No global Evolution API configured`);
    return null;
  }

  const instanceName = globalOtp?.value?.instance_name;
  if (!instanceName) {
    console.log(`[reminders] No global OTP instance configured`);
    return null;
  }

  const config: WhatsAppConfig = {
    apiUrl: globalEvolution.value.api_url,
    apiKey: globalEvolution.value.api_key,
    instanceName,
    source: 'global'
  };

  // Verificar conexão
  const health = await checkInstanceHealth(config);
  if (!health.connected) {
    console.log(`[reminders] Global instance not connected`);
    return null;
  }

  console.log(`[reminders] Using global config: ${instanceName}`);
  return config;
}

async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  const phoneNumber = formatPhoneNumber(to);
  
  console.log(`[reminders] Sending to ${phoneNumber} via ${config.instanceName}`);

  try {
    const response = await fetch(`${apiUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      },
      body: JSON.stringify({ number: phoneNumber, text: message })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      const errorMsg = responseData?.message || responseData?.error || JSON.stringify(responseData);
      console.error(`[reminders] Send failed:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = responseData?.key?.id || responseData?.messageId || responseData?.id;
    console.log(`[reminders] Message sent: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[reminders] Send exception:`, error);
    return { success: false, error: errorMsg };
  }
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[reminders] Starting at ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar agendamentos próximos (próximas 2 horas)
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        time,
        status,
        barbershop_id,
        client:clients!inner(name, phone),
        service:services(name),
        staff:staff(name)
      `)
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', twoHoursLater.toISOString().split('T')[0])
      .in('status', ['scheduled', 'confirmed'])
      .is('reminder_sent', null);

    if (fetchError) {
      console.error('[reminders] Fetch error:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: fetchError.message,
        functionVersion: FUNCTION_VERSION
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!appointments?.length) {
      console.log('[reminders] No appointments to remind');
      return new Response(JSON.stringify({ 
        message: 'No appointments to remind', 
        count: 0,
        functionVersion: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[reminders] Found ${appointments.length} appointments`);

    // Agrupar por barbershop para resolver config uma vez por barbearia
    const appointmentsByBarbershop: Record<string, typeof appointments> = {};
    for (const apt of appointments) {
      const bbId = apt.barbershop_id;
      if (!appointmentsByBarbershop[bbId]) {
        appointmentsByBarbershop[bbId] = [];
      }
      appointmentsByBarbershop[bbId].push(apt);
    }

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const [barbershopId, bbAppointments] of Object.entries(appointmentsByBarbershop)) {
      // Resolver config para esta barbearia
      const config = await resolveWhatsAppConfig(supabase, barbershopId);
      
      if (!config) {
        console.log(`[reminders] No WhatsApp config for barbershop ${barbershopId}`);
        failed += bbAppointments.length;
        results.push({
          barbershopId,
          status: 'no_config',
          appointmentCount: bbAppointments.length
        });
        continue;
      }

      for (const apt of bbAppointments) {
        const clientName = apt.client?.name || 'Cliente';
        const clientPhone = apt.client?.phone;
        const serviceName = apt.service?.name || 'serviço';
        const staffName = apt.staff?.name || '';

        if (!clientPhone) {
          console.log(`[reminders] No phone for appointment ${apt.id}`);
          failed++;
          continue;
        }

        // Montar mensagem
        const message = `Olá ${clientName}! 👋\n\nLembrete do seu agendamento:\n📅 ${apt.date}\n⏰ ${apt.time}\n✂️ ${serviceName}${staffName ? `\n👤 ${staffName}` : ''}\n\nAté logo!`;

        const result = await sendWhatsAppMessage(config, clientPhone, message);

        if (result.success) {
          sent++;
          // Marcar como enviado
          await supabase
            .from('appointments')
            .update({ reminder_sent: new Date().toISOString() })
            .eq('id', apt.id);

          // Log
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: barbershopId,
            recipient_phone: formatPhoneNumber(clientPhone),
            recipient_name: clientName,
            message_content: message,
            message_type: 'reminder',
            status: 'sent',
            provider: 'evolution',
            whatsapp_message_id: result.messageId,
            appointment_id: apt.id
          });
        } else {
          failed++;
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: barbershopId,
            recipient_phone: formatPhoneNumber(clientPhone),
            recipient_name: clientName,
            message_content: message,
            message_type: 'reminder',
            status: 'failed',
            provider: 'evolution',
            error_message: result.error,
            appointment_id: apt.id
          });
        }
      }

      results.push({
        barbershopId,
        configSource: config.source,
        instanceName: config.instanceName,
        appointmentCount: bbAppointments.length
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[reminders] Completed: ${sent} sent, ${failed} failed in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      total: appointments.length,
      duration: `${duration}ms`,
      functionVersion: FUNCTION_VERSION,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[reminders] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error',
      functionVersion: FUNCTION_VERSION
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
