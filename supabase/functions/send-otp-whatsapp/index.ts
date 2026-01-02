// Edge Function para enviar código OTP via WhatsApp usando Evolution API
// Solução definitiva com fallback automático e diagnóstico aprimorado
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos para melhor tipagem
interface EvolutionConfig {
  api_url: string;
  api_key: string;
}

interface OtpWhatsAppConfig {
  instance_name?: string;
  instanceName?: string;
  status?: string;
  connection_status?: string;
}

interface WhatsAppInstanceConfig {
  api_url?: string;
  api_key?: string;
  instance_name?: string;
  instanceName?: string;
  connection_status?: string;
  status?: string;
  state?: string;
  connectionState?: string;
}

interface InstanceCheckResult {
  exists: boolean;
  connected: boolean;
  state: string | null;
  error?: string;
}

// Normalizar nome da instância (remover espaços e caracteres inválidos)
function normalizeInstanceName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase();
}

// Verificar se instância existe e está conectada no Evolution
async function checkInstanceStatus(
  apiUrl: string,
  apiKey: string,
  instanceName: string
): Promise<InstanceCheckResult> {
  const normalizedName = normalizeInstanceName(instanceName);
  const checkUrl = `${apiUrl.replace(/\/+$/, '')}/instance/connectionState/${normalizedName}`;
  
  console.log(`[OTP] Verificando instância: ${checkUrl}`);

  try {
    const response = await fetch(checkUrl, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    if (response.status === 404) {
      console.log(`[OTP] Instância ${normalizedName} não existe (404)`);
      return { exists: false, connected: false, state: null, error: 'INSTANCE_NOT_FOUND' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[OTP] Erro ao verificar instância (${response.status}): ${errorText}`);
      
      // Verificar se é erro de instância não encontrada em formato diferente
      if (errorText.includes('not found') || errorText.includes('não encontrada') || errorText.includes('Nenhuma instância')) {
        return { exists: false, connected: false, state: null, error: 'INSTANCE_NOT_FOUND' };
      }
      
      return { exists: true, connected: false, state: 'unknown', error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    const state = data?.state || data?.instance?.state;
    const isConnected = state === 'open';
    
    console.log(`[OTP] Estado da instância ${normalizedName}: ${state} (connected: ${isConnected})`);
    
    return { exists: true, connected: isConnected, state };
  } catch (error: any) {
    console.error(`[OTP] Erro de conexão ao verificar instância: ${error.message}`);
    return { exists: true, connected: false, state: null, error: 'CONNECTION_ERROR' };
  }
}

// Buscar instância alternativa de barbearia que esteja conectada
async function findFallbackInstance(
  supabase: any,
  globalApiUrl: string,
  globalApiKey: string
): Promise<{ instanceName: string; apiUrl: string; apiKey: string; barbershopId: string } | null> {
  console.log('[OTP] Buscando instância fallback...');

  const { data: configs, error } = await supabase
    .from('whatsapp_config')
    .select('config, barbershop_id, is_active')
    .eq('provider', 'evolution');

  if (error || !configs?.length) {
    console.log('[OTP] Nenhuma config de barbearia encontrada');
    return null;
  }

  // Ordenar: ativas primeiro, depois por config
  const sortedConfigs = configs
    .filter((c: any) => {
      const cfg = c.config as WhatsAppInstanceConfig;
      const instName = cfg?.instance_name || cfg?.instanceName;
      return !!instName;
    })
    .sort((a: any, b: any) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));

  // Testar cada instância (máximo 5 para não demorar muito)
  for (const config of sortedConfigs.slice(0, 5)) {
    const cfg = config.config as WhatsAppInstanceConfig;
    const instanceName = cfg?.instance_name || cfg?.instanceName;
    const apiUrl = cfg?.api_url || globalApiUrl;
    const apiKey = cfg?.api_key || globalApiKey;

    if (!instanceName) continue;

    const status = await checkInstanceStatus(apiUrl, apiKey, instanceName);
    
    if (status.exists && status.connected) {
      console.log(`[OTP] Encontrada instância fallback: ${instanceName} (barbershop: ${config.barbershop_id})`);
      return {
        instanceName: normalizeInstanceName(instanceName),
        apiUrl,
        apiKey,
        barbershopId: config.barbershop_id,
      };
    }
  }

  console.log('[OTP] Nenhuma instância fallback disponível');
  return null;
}

// Log de falha no whatsapp_logs
async function logFailure(
  supabase: any,
  phone: string,
  errorMessage: string,
  instanceName?: string,
  usedFallback?: boolean
) {
  try {
    await supabase.from('whatsapp_logs').insert({
      barbershop_id: null,
      recipient_phone: phone,
      message_content: `[OTP] Falha${usedFallback ? ' (fallback)' : ''}`,
      status: 'failed',
      provider: 'evolution',
      message_type: 'otp',
      error_message: `${errorMessage}${instanceName ? ` | Instance: ${instanceName}` : ''}`,
    });
  } catch (e) {
    console.warn('[OTP] Erro ao logar falha:', e);
  }
}

// Log de sucesso
async function logSuccess(
  supabase: any,
  phone: string,
  instanceName: string,
  usedFallback: boolean
) {
  try {
    await supabase.from('whatsapp_logs').insert({
      barbershop_id: null,
      recipient_phone: phone,
      message_content: `[OTP] Código enviado${usedFallback ? ' (via fallback)' : ''}`,
      status: 'sent',
      provider: 'evolution',
      message_type: 'otp',
    });
  } catch (e) {
    console.warn('[OTP] Erro ao logar sucesso:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Número de telefone é obrigatório',
          error_code: 'MISSING_PHONE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[OTP] Iniciando para: ${formattedPhone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: máx 10 códigos por hora por telefone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('auth_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', formattedPhone)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 10) {
      console.log(`[OTP] Rate limit excedido para: ${formattedPhone} (${recentCount} tentativas)`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Muitas tentativas. Aguarde 1 hora antes de solicitar novo código.',
          error_code: 'RATE_LIMITED',
          details: { attempts: recentCount, limit: 10 }
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração global da Evolution API
    const { data: evolutionConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'evolution_api')
      .maybeSingle();

    if (!evolutionConfig?.value?.api_url || !evolutionConfig?.value?.api_key) {
      console.error('[OTP] Evolution API não configurada');
      await logFailure(supabase, formattedPhone, 'Evolution API não configurada');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WhatsApp não configurado. Configure o servidor Evolution API no painel SaaS Admin.',
          error_code: 'EVOLUTION_NOT_CONFIGURED',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const globalApiUrl = evolutionConfig.value.api_url;
    const globalApiKey = evolutionConfig.value.api_key;

    // Buscar configuração da instância OTP global
    const { data: otpConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'otp_whatsapp')
      .maybeSingle();

    let instanceName = otpConfig?.value?.instance_name ?? otpConfig?.value?.instanceName;
    let apiUrl = globalApiUrl;
    let apiKey = globalApiKey;
    let usedFallback = false;
    let fallbackBarbershopId: string | null = null;

    // Verificar instância OTP global
    if (instanceName) {
      instanceName = normalizeInstanceName(instanceName);
      console.log(`[OTP] Verificando instância OTP global: ${instanceName}`);

      const status = await checkInstanceStatus(apiUrl, apiKey, instanceName);

      if (!status.exists) {
        console.log('[OTP] Instância OTP global não existe, atualizando status e buscando fallback...');
        
        // Atualizar status no banco
        await supabase
          .from('system_config')
          .update({
            value: { ...otpConfig?.value, status: 'missing' },
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'otp_whatsapp');

        // Buscar fallback
        const fallback = await findFallbackInstance(supabase, globalApiUrl, globalApiKey);
        
        if (fallback) {
          instanceName = fallback.instanceName;
          apiUrl = fallback.apiUrl;
          apiKey = fallback.apiKey;
          usedFallback = true;
          fallbackBarbershopId = fallback.barbershopId;
        } else {
          await logFailure(supabase, formattedPhone, 'Instância OTP não existe e nenhum fallback disponível', instanceName);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Instância WhatsApp OTP não encontrada. Reconecte no SaaS Admin → OTP WhatsApp ou configure o WhatsApp de uma barbearia.',
              error_code: 'OTP_INSTANCE_MISSING',
              details: {
                instanceName,
                apiUrl: apiUrl.replace(/\/+$/, ''),
                hint: 'Recrie ou reconecte a instância OTP no painel SaaS Admin'
              }
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (!status.connected) {
        console.log(`[OTP] Instância OTP global desconectada (state: ${status.state}), buscando fallback...`);
        
        // Atualizar status no banco
        await supabase
          .from('system_config')
          .update({
            value: { ...otpConfig?.value, status: 'disconnected' },
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'otp_whatsapp');

        // Buscar fallback
        const fallback = await findFallbackInstance(supabase, globalApiUrl, globalApiKey);
        
        if (fallback) {
          instanceName = fallback.instanceName;
          apiUrl = fallback.apiUrl;
          apiKey = fallback.apiKey;
          usedFallback = true;
          fallbackBarbershopId = fallback.barbershopId;
        } else {
          await logFailure(supabase, formattedPhone, `Instância desconectada (state: ${status.state}) e nenhum fallback`, instanceName);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'WhatsApp OTP desconectado. Reconecte escaneando o QR Code no SaaS Admin.',
              error_code: 'OTP_INSTANCE_DISCONNECTED',
              details: {
                instanceName,
                state: status.state,
                apiUrl: apiUrl.replace(/\/+$/, ''),
              }
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log(`[OTP] Instância OTP global OK: ${instanceName} (state: ${status.state})`);
      }
    } else {
      // Não há instância OTP configurada, buscar fallback
      console.log('[OTP] Nenhuma instância OTP configurada, buscando fallback...');
      
      const fallback = await findFallbackInstance(supabase, globalApiUrl, globalApiKey);
      
      if (fallback) {
        instanceName = fallback.instanceName;
        apiUrl = fallback.apiUrl;
        apiKey = fallback.apiKey;
        usedFallback = true;
        fallbackBarbershopId = fallback.barbershopId;
      } else {
        await logFailure(supabase, formattedPhone, 'Nenhuma instância OTP configurada e nenhum fallback disponível');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Nenhuma instância WhatsApp disponível. Configure a instância OTP global ou conecte o WhatsApp de uma barbearia.',
            error_code: 'NO_AVAILABLE_INSTANCE',
            details: {
              otpConfigured: false,
              fallbacksChecked: true,
            }
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[OTP] Usando instância: ${instanceName}${usedFallback ? ' (FALLBACK)' : ''}`);

    // Invalidar códigos anteriores não verificados
    await supabase
      .from('auth_otp_codes')
      .update({ verified: true })
      .eq('phone', formattedPhone)
      .eq('verified', false);

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Definir expiração (5 minutos)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Salvar código no banco
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
      console.error('[OTP] Erro ao salvar código:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao gerar código de verificação',
          error_code: 'DB_INSERT_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mensagem do código OTP
    const message = `🔐 *Código de Verificação*\n\nSeu código de acesso é: *${code}*\n\nEste código expira em 5 minutos.\n\n_Se você não solicitou este código, ignore esta mensagem._`;

    // Enviar via Evolution API
    const evolutionUrl = `${apiUrl.replace(/\/+$/, '')}/message/sendText/${instanceName}`;

    console.log(`[OTP] Enviando para Evolution: ${evolutionUrl}`);

    const response = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const responseText = await response.text();
    let responseData: any = null;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText.substring(0, 500) };
    }

    if (!response.ok) {
      console.error('[OTP] Erro ao enviar WhatsApp:', { status: response.status, responseData });

      // Deletar o código OTP já que falhou
      await supabase
        .from('auth_otp_codes')
        .delete()
        .eq('phone', formattedPhone)
        .eq('code', code);

      const errorMessage = responseData?.error || responseData?.message || responseData?.raw || 'Erro ao enviar código via WhatsApp';
      
      await logFailure(supabase, formattedPhone, errorMessage, instanceName, usedFallback);

      // Determinar código de erro apropriado
      let errorCode = 'EVOLUTION_SEND_ERROR';
      if (errorMessage.includes('not found') || errorMessage.includes('não encontrada') || errorMessage.includes('Nenhuma instância')) {
        errorCode = 'INSTANCE_NOT_FOUND_ON_SEND';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: errorCode,
          details: {
            httpStatus: response.status,
            endpoint: evolutionUrl,
            instanceName,
            usedFallback,
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[OTP] ✓ Código enviado com sucesso para: ${formattedPhone}`);

    await logSuccess(supabase, formattedPhone, instanceName, usedFallback);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código enviado via WhatsApp',
        expiresAt,
        meta: {
          usedFallback,
          instanceName,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[OTP] Erro não tratado:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        error_code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
