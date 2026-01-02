// Edge Function para enviar código OTP via WhatsApp usando Evolution API
// Versão 5: Arquitetura limpa com hierarquia clara (global → fallback)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_VERSION = '2025-01-02.otp-v5-clean';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Function-Version': FUNCTION_VERSION,
};

// ============================================
// TIPOS
// ============================================

interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  source: 'global' | 'barbershop_fallback';
  barbershopId?: string;
}

interface InstanceCheckResult {
  exists: boolean;
  connected: boolean;
  state: string | null;
  error?: string;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Verificar se instância existe e está conectada
async function checkInstanceHealth(apiUrl: string, apiKey: string, instanceName: string): Promise<InstanceCheckResult> {
  const url = `${apiUrl.replace(/\/+$/, '')}/instance/connectionState/${instanceName.trim()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    if (response.status === 404) {
      return { exists: false, connected: false, state: null, error: 'NOT_FOUND' };
    }

    const data = await response.json();
    const state = data?.state || data?.instance?.state;
    
    return { 
      exists: true, 
      connected: state === 'open', 
      state 
    };
  } catch (error: any) {
    return { exists: true, connected: false, state: null, error: error.message };
  }
}

// Resolver configuração WhatsApp - usa global, com fallback para barbearias conectadas
async function resolveWhatsAppConfig(supabase: any): Promise<WhatsAppConfig | null> {
  console.log('[OTP] Resolvendo configuração WhatsApp...');
  
  // 1. Buscar configuração global da Evolution API
  const { data: evolutionConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'evolution_api')
    .maybeSingle();

  const globalApiUrl = evolutionConfig?.value?.api_url;
  const globalApiKey = evolutionConfig?.value?.api_key;

  if (!globalApiUrl || !globalApiKey) {
    console.log('[OTP] Evolution API não configurada');
    return null;
  }

  // 2. Buscar instância OTP global
  const { data: otpConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'otp_whatsapp')
    .maybeSingle();

  const otpInstanceName = otpConfig?.value?.instance_name || otpConfig?.value?.instanceName;

  if (otpInstanceName) {
    // Verificar se a instância global está conectada
    const health = await checkInstanceHealth(globalApiUrl, globalApiKey, otpInstanceName);
    
    if (health.connected) {
      console.log(`[OTP] ✓ Usando instância global OTP: ${otpInstanceName}`);
      return {
        apiUrl: globalApiUrl,
        apiKey: globalApiKey,
        instanceName: otpInstanceName.trim(),
        source: 'global'
      };
    }
    
    console.log(`[OTP] Instância global OTP indisponível: ${otpInstanceName} (state: ${health.state}, error: ${health.error})`);
    
    // Atualizar status no banco
    await supabase
      .from('system_config')
      .update({
        value: { 
          ...otpConfig?.value, 
          status: health.exists ? 'disconnected' : 'missing',
          last_check: new Date().toISOString()
        }
      })
      .eq('key', 'otp_whatsapp');
  } else {
    console.log('[OTP] Nenhuma instância OTP global configurada');
  }

  // 3. Fallback: buscar barbearias com WhatsApp conectado
  console.log('[OTP] Buscando fallback em barbearias...');
  
  const { data: configs } = await supabase
    .from('whatsapp_config')
    .select('config, barbershop_id, is_active')
    .eq('provider', 'evolution')
    .eq('is_active', true)
    .limit(10);

  if (!configs?.length) {
    console.log('[OTP] Nenhuma barbearia com WhatsApp ativo');
    return null;
  }

  // Testar cada barbearia
  for (const cfg of configs) {
    const instanceName = cfg.config?.instance_name || cfg.config?.instanceName;
    if (!instanceName) continue;

    const apiUrl = cfg.config?.api_url || globalApiUrl;
    const apiKey = cfg.config?.api_key || globalApiKey;

    const health = await checkInstanceHealth(apiUrl, apiKey, instanceName);
    
    if (health.connected) {
      console.log(`[OTP] ✓ Usando fallback: ${instanceName} (barbearia: ${cfg.barbershop_id})`);
      return {
        apiUrl,
        apiKey,
        instanceName: instanceName.trim(),
        source: 'barbershop_fallback',
        barbershopId: cfg.barbershop_id
      };
    }
  }

  console.log('[OTP] Nenhum fallback disponível');
  return null;
}

// Enviar mensagem via Evolution API
async function sendWhatsAppMessage(
  config: WhatsAppConfig, 
  phone: string, 
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/message/sendText/${config.instanceName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({ number: phone, text: message }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || data?.message || `HTTP ${response.status}` };
    }

    return { success: true, messageId: data?.key?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Registrar log de WhatsApp
async function logWhatsAppMessage(
  supabase: any,
  phone: string,
  status: 'sent' | 'failed',
  config: WhatsAppConfig | null,
  error?: string
) {
  try {
    await supabase.from('whatsapp_logs').insert({
      barbershop_id: config?.barbershopId || null,
      recipient_phone: phone,
      message_content: '[OTP]',
      status,
      provider: 'evolution',
      message_type: 'otp',
      error_message: error ? `${error} | v${FUNCTION_VERSION}` : null,
    });
  } catch (e) {
    console.warn('[OTP] Erro ao logar:', e);
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { phone, action } = body;

    // =====================
    // MODO DIAGNÓSTICO
    // =====================
    if (action === 'diagnose') {
      console.log(`[OTP] Diagnóstico v${FUNCTION_VERSION}`);
      
      const config = await resolveWhatsAppConfig(supabase);
      
      let instanceHealth: InstanceCheckResult | null = null;
      if (config) {
        instanceHealth = await checkInstanceHealth(config.apiUrl, config.apiKey, config.instanceName);
      }

      // Buscar config raw do banco
      const { data: evolutionConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      const { data: otpConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          action: 'diagnose',
          functionVersion: FUNCTION_VERSION,
          timestamp: new Date().toISOString(),
          
          // Configuração no banco
          database: {
            evolutionApiConfigured: !!(evolutionConfig?.value?.api_url && evolutionConfig?.value?.api_key),
            apiUrl: evolutionConfig?.value?.api_url || null,
            otpInstanceName: otpConfig?.value?.instance_name || otpConfig?.value?.instanceName || null,
            otpStatus: otpConfig?.value?.status || null,
          },
          
          // Configuração resolvida
          resolved: config ? {
            source: config.source,
            instanceName: config.instanceName,
            barbershopId: config.barbershopId || null,
          } : null,
          
          // Health check em tempo real
          health: instanceHealth ? {
            exists: instanceHealth.exists,
            connected: instanceHealth.connected,
            state: instanceHealth.state,
            error: instanceHealth.error,
          } : null,
          
          // Resultado
          ready: config !== null && (instanceHealth?.connected === true),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================
    // ENVIO DE OTP
    // =====================
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Número de telefone é obrigatório',
          error_code: 'MISSING_PHONE',
          functionVersion: FUNCTION_VERSION,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[OTP v${FUNCTION_VERSION}] Iniciando para: ${formattedPhone}`);

    // Rate limiting: máx 10 códigos por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('auth_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', formattedPhone)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Muitas tentativas. Aguarde 1 hora.',
          error_code: 'RATE_LIMITED',
          functionVersion: FUNCTION_VERSION,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolver configuração WhatsApp
    const config = await resolveWhatsAppConfig(supabase);

    if (!config) {
      await logWhatsAppMessage(supabase, formattedPhone, 'failed', null, 'Nenhum WhatsApp disponível');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhum WhatsApp disponível. Configure a instância OTP global ou conecte o WhatsApp de uma barbearia.',
          error_code: 'NO_WHATSAPP_AVAILABLE',
          functionVersion: FUNCTION_VERSION,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalidar códigos anteriores
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('phone', formattedPhone)
      .eq('verified', false);

    // Gerar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Salvar código
    const { error: insertError } = await supabase
      .from('auth_otp_codes')
      .insert({
        phone: formattedPhone,
        code,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao gerar código',
          error_code: 'DB_ERROR',
          functionVersion: FUNCTION_VERSION,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mensagem
    const message = `🔐 *Código de Verificação*\n\nSeu código de acesso é: *${code}*\n\nEste código expira em 5 minutos.\n\n_Se você não solicitou este código, ignore esta mensagem._`;

    // Enviar
    const result = await sendWhatsAppMessage(config, formattedPhone, message);

    if (!result.success) {
      // Deletar código
      await supabase.from('auth_otp_codes').delete().eq('phone', formattedPhone).eq('code', code);
      await logWhatsAppMessage(supabase, formattedPhone, 'failed', config, result.error);

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Erro ao enviar WhatsApp',
          error_code: 'SEND_ERROR',
          functionVersion: FUNCTION_VERSION,
          details: {
            source: config.source,
            instanceName: config.instanceName,
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[OTP] ✓ Código enviado para ${formattedPhone} via ${config.source}:${config.instanceName}`);
    await logWhatsAppMessage(supabase, formattedPhone, 'sent', config);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código enviado via WhatsApp',
        expiresAt,
        functionVersion: FUNCTION_VERSION,
        meta: {
          source: config.source,
          instanceName: config.instanceName,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[OTP] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno',
        error_code: 'INTERNAL_ERROR',
        functionVersion: FUNCTION_VERSION,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
