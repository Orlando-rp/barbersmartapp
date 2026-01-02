/**
 * Send Review Request via WhatsApp
 * 
 * Hierarquia de configuração:
 * 1. Configuração específica da barbearia (whatsapp_config)
 * 2. Configuração global (system_config.evolution_api + system_config.otp_whatsapp)
 * 
 * @version 2025-01-02.review-v3
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = '2025-01-02.review-v3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Function-Version": FUNCTION_VERSION
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
    console.error(`[review] Health check error:`, error);
    return { connected: false, state: 'error' };
  }
}

async function resolveWhatsAppConfig(
  supabase: any,
  barbershopId?: string | null
): Promise<WhatsAppConfig | null> {
  console.log(`[review] Resolving config for barbershop: ${barbershopId || 'GLOBAL'}`);

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
        
        const health = await checkInstanceHealth(config);
        if (health.connected) {
          console.log(`[review] Using barbershop config: ${instanceName}`);
          return config;
        }
        console.log(`[review] Barbershop instance not connected, trying global`);
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
    console.log(`[review] No global Evolution API configured`);
    return null;
  }

  const instanceName = globalOtp?.value?.instance_name;
  if (!instanceName) {
    console.log(`[review] No global OTP instance configured`);
    return null;
  }

  const config: WhatsAppConfig = {
    apiUrl: globalEvolution.value.api_url,
    apiKey: globalEvolution.value.api_key,
    instanceName,
    source: 'global'
  };

  const health = await checkInstanceHealth(config);
  if (!health.connected) {
    console.log(`[review] Global instance not connected`);
    return null;
  }

  console.log(`[review] Using global config: ${instanceName}`);
  return config;
}

async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  const phoneNumber = formatPhoneNumber(to);
  
  console.log(`[review] Sending to ${phoneNumber} via ${config.instanceName}`);

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
      console.error(`[review] Send failed:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = responseData?.key?.id || responseData?.messageId || responseData?.id;
    console.log(`[review] Message sent: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[review] Send exception:`, error);
    return { success: false, error: errorMsg };
  }
}

// ============= Main Handler =============

interface ReviewRequest {
  appointmentId: string;
  barbershopId: string;
  clientName: string;
  clientPhone: string;
  staffName?: string;
  serviceName?: string;
  reviewLink?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[review] Starting at ${new Date().toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: ReviewRequest = await req.json();
    const { appointmentId, barbershopId, clientName, clientPhone, staffName, serviceName, reviewLink } = body;

    if (!barbershopId || !clientPhone) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        required: ['barbershopId', 'clientPhone'],
        functionVersion: FUNCTION_VERSION
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolver configuração WhatsApp
    const config = await resolveWhatsAppConfig(supabase, barbershopId);
    
    if (!config) {
      return new Response(JSON.stringify({
        error: 'WhatsApp não configurado',
        error_code: 'NO_CONFIG',
        barbershopId,
        functionVersion: FUNCTION_VERSION
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Montar mensagem de avaliação
    const message = `Olá ${clientName || 'Cliente'}! 😊\n\nObrigado por visitar nossa barbearia${staffName ? ` e ser atendido por ${staffName}` : ''}!\n\n⭐ Que tal nos contar como foi sua experiência?\n\n${reviewLink || 'Sua opinião é muito importante para nós!'}\n\nAgradecemos sua visita e esperamos você em breve!`;

    const result = await sendWhatsAppMessage(config, clientPhone, message);

    // Log no banco
    await supabase.from('whatsapp_logs').insert({
      barbershop_id: barbershopId,
      recipient_phone: formatPhoneNumber(clientPhone),
      recipient_name: clientName || 'Cliente',
      message_content: message,
      message_type: 'review_request',
      status: result.success ? 'sent' : 'failed',
      provider: 'evolution',
      whatsapp_message_id: result.messageId,
      error_message: result.error,
      appointment_id: appointmentId
    });

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        messageId: result.messageId,
        configSource: config.source,
        instanceUsed: config.instanceName,
        functionVersion: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        configSource: config.source,
        instanceUsed: config.instanceName,
        functionVersion: FUNCTION_VERSION
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('[review] Unexpected error:', error);
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
