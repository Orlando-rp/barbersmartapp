// Edge Function para enviar código OTP via WhatsApp usando Evolution API
// Versão com diagnóstico aprimorado e auto-reparo de nome de instância
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Versão da função para debugging
const FUNCTION_VERSION = '2025-01-02.otp-v4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Function-Version': FUNCTION_VERSION,
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
  rawResponse?: any;
}

interface EvolutionInstance {
  instanceName: string;
  state?: string;
  status?: string;
}

// Sanitização mínima do nome (apenas trim, sem lowercase agressivo)
function sanitizeInstanceName(name: string): string {
  return name.trim();
}

// Buscar todas as instâncias do Evolution
async function fetchAllInstances(
  apiUrl: string,
  apiKey: string
): Promise<{ instances: EvolutionInstance[]; error?: string }> {
  const url = `${apiUrl.replace(/\/+$/, '')}/instance/fetchInstances`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    if (!response.ok) {
      return { instances: [], error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    let instances: EvolutionInstance[] = [];

    if (Array.isArray(data)) {
      instances = data.map((inst: any) => ({
        instanceName: inst.instanceName || inst.instance?.instanceName || inst.name || '',
        state: inst.state || inst.instance?.state,
        status: inst.status || inst.connectionStatus,
      }));
    } else if (data?.instances && Array.isArray(data.instances)) {
      instances = data.instances.map((inst: any) => ({
        instanceName: inst.instanceName || inst.instance?.instanceName || inst.name || '',
        state: inst.state || inst.instance?.state,
        status: inst.status || inst.connectionStatus,
      }));
    }

    return { instances };
  } catch (error: any) {
    return { instances: [], error: error.message };
  }
}

// Verificar se instância existe e está conectada no Evolution
async function checkInstanceStatus(
  apiUrl: string,
  apiKey: string,
  instanceName: string
): Promise<InstanceCheckResult> {
  const cleanName = sanitizeInstanceName(instanceName);
  const checkUrl = `${apiUrl.replace(/\/+$/, '')}/instance/connectionState/${cleanName}`;
  
  console.log(`[OTP] Verificando instância: ${checkUrl}`);

  try {
    const response = await fetch(checkUrl, {
      method: 'GET',
      headers: { 'apikey': apiKey },
    });

    if (response.status === 404) {
      console.log(`[OTP] Instância ${cleanName} não existe (404)`);
      return { exists: false, connected: false, state: null, error: 'INSTANCE_NOT_FOUND' };
    }

    const responseText = await response.text();
    let data: any = null;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.log(`[OTP] Erro ao verificar instância (${response.status}): ${responseText}`);
      
      if (responseText.includes('not found') || responseText.includes('não encontrada') || responseText.includes('Nenhuma instância')) {
        return { exists: false, connected: false, state: null, error: 'INSTANCE_NOT_FOUND', rawResponse: data };
      }
      
      return { exists: true, connected: false, state: 'unknown', error: `HTTP_${response.status}`, rawResponse: data };
    }

    const state = data?.state || data?.instance?.state;
    const isConnected = state === 'open';
    
    console.log(`[OTP] Estado da instância ${cleanName}: ${state} (connected: ${isConnected})`);
    
    return { exists: true, connected: isConnected, state, rawResponse: data };
  } catch (error: any) {
    console.error(`[OTP] Erro de conexão ao verificar instância: ${error.message}`);
    return { exists: true, connected: false, state: null, error: 'CONNECTION_ERROR' };
  }
}

// Encontrar instância por nome (case-insensitive)
function findInstanceByName(instances: EvolutionInstance[], targetName: string): EvolutionInstance | null {
  const targetLower = targetName.toLowerCase().trim();
  return instances.find(inst => 
    inst.instanceName.toLowerCase().trim() === targetLower
  ) || null;
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

  const sortedConfigs = configs
    .filter((c: any) => {
      const cfg = c.config as WhatsAppInstanceConfig;
      const instName = cfg?.instance_name || cfg?.instanceName;
      return !!instName;
    })
    .sort((a: any, b: any) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));

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
        instanceName: sanitizeInstanceName(instanceName),
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
      error_message: `${errorMessage}${instanceName ? ` | Instance: ${instanceName}` : ''} | v${FUNCTION_VERSION}`,
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

// Tentar enviar mensagem via Evolution API
async function sendViaEvolution(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string; httpStatus?: number; response?: any }> {
  const evolutionUrl = `${apiUrl.replace(/\/+$/, '')}/message/sendText/${instanceName}`;

  console.log(`[OTP] Enviando para Evolution: ${evolutionUrl}`);

  try {
    const response = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: phone,
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
      const errorMessage = responseData?.error || responseData?.message || responseData?.raw || 'Erro desconhecido';
      return { success: false, error: errorMessage, httpStatus: response.status, response: responseData };
    }

    return { success: true, response: responseData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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
      console.log(`[OTP] Modo diagnóstico iniciado (v${FUNCTION_VERSION})`);

      // Buscar configuração global da Evolution API
      const { data: evolutionConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      // Buscar configuração da instância OTP global
      const { data: otpConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      const apiUrl = evolutionConfig?.value?.api_url || null;
      const apiKey = evolutionConfig?.value?.api_key || null;
      const otpInstanceName = otpConfig?.value?.instance_name || otpConfig?.value?.instanceName || null;

      let apiReachable = false;
      let allInstances: EvolutionInstance[] = [];
      let otpInstanceCheck: InstanceCheckResult | null = null;
      let suggestedFix: string | null = null;

      if (apiUrl && apiKey) {
        // Verificar API
        const fetchResult = await fetchAllInstances(apiUrl, apiKey);
        apiReachable = !fetchResult.error;
        allInstances = fetchResult.instances;

        // Verificar instância OTP
        if (otpInstanceName) {
          otpInstanceCheck = await checkInstanceStatus(apiUrl, apiKey, otpInstanceName);

          // Se não existe, verificar se há match case-insensitive
          if (!otpInstanceCheck.exists) {
            const matchedInstance = findInstanceByName(allInstances, otpInstanceName);
            if (matchedInstance) {
              suggestedFix = `Instância encontrada com nome diferente: "${matchedInstance.instanceName}". O nome salvo é "${otpInstanceName}". Atualize para o nome correto.`;
            } else {
              suggestedFix = 'Instância não existe no Evolution. Crie a instância ou selecione uma existente.';
            }
          } else if (!otpInstanceCheck.connected) {
            suggestedFix = `Instância existe mas está desconectada (state: ${otpInstanceCheck.state}). Reconecte escaneando o QR Code.`;
          }
        } else {
          suggestedFix = 'Nenhuma instância OTP configurada. Configure uma instância na aba OTP WhatsApp.';
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'diagnose',
          functionVersion: FUNCTION_VERSION,
          timestamp: new Date().toISOString(),
          config: {
            evolutionApiConfigured: !!(apiUrl && apiKey),
            apiUrl: apiUrl ? apiUrl.replace(/\/+$/, '') : null,
            otpInstanceFromDb: otpInstanceName,
            otpDbStatus: otpConfig?.value?.status || null,
          },
          realTimeCheck: {
            apiReachable,
            otpInstance: otpInstanceCheck ? {
              exists: otpInstanceCheck.exists,
              connected: otpInstanceCheck.connected,
              state: otpInstanceCheck.state,
              error: otpInstanceCheck.error,
            } : null,
          },
          allInstances: allInstances.map(inst => ({
            name: inst.instanceName,
            state: inst.state || inst.status,
          })),
          suggestedFix,
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
          functionVersion: FUNCTION_VERSION,
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
          functionVersion: FUNCTION_VERSION,
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
      instanceName = sanitizeInstanceName(instanceName);
      console.log(`[OTP] Verificando instância OTP global: ${instanceName}`);

      const status = await checkInstanceStatus(apiUrl, apiKey, instanceName);

      if (!status.exists) {
        console.log('[OTP] Instância OTP global não existe, tentando auto-reparo...');

        // Tentar encontrar por nome case-insensitive
        const { instances: allInstances } = await fetchAllInstances(apiUrl, apiKey);
        const matchedInstance = findInstanceByName(allInstances, instanceName);

        if (matchedInstance && matchedInstance.instanceName !== instanceName) {
          console.log(`[OTP] Auto-reparo: usando nome correto "${matchedInstance.instanceName}" em vez de "${instanceName}"`);
          instanceName = matchedInstance.instanceName;
          
          // Verificar se está conectada
          const newStatus = await checkInstanceStatus(apiUrl, apiKey, instanceName);
          
          if (newStatus.connected) {
            // Atualizar banco com nome correto
            await supabase
              .from('system_config')
              .update({
                value: { ...otpConfig?.value, instance_name: instanceName, status: 'connected' },
                updated_at: new Date().toISOString(),
              })
              .eq('key', 'otp_whatsapp');
            
            console.log(`[OTP] Auto-reparo bem-sucedido: instância ${instanceName} atualizada`);
          } else {
            // Instância existe mas não está conectada
            await supabase
              .from('system_config')
              .update({
                value: { ...otpConfig?.value, instance_name: instanceName, status: 'disconnected' },
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
              await logFailure(supabase, formattedPhone, `Instância desconectada (state: ${newStatus.state}) e nenhum fallback`, instanceName);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'WhatsApp OTP desconectado. Reconecte escaneando o QR Code no SaaS Admin.',
                  error_code: 'OTP_INSTANCE_DISCONNECTED',
                  functionVersion: FUNCTION_VERSION,
                  details: {
                    instanceName,
                    state: newStatus.state,
                    apiUrl: apiUrl.replace(/\/+$/, ''),
                  }
                }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } else {
          // Não encontrou por nome, atualizar status e buscar fallback
          await supabase
            .from('system_config')
            .update({
              value: { ...otpConfig?.value, status: 'missing' },
              updated_at: new Date().toISOString(),
            })
            .eq('key', 'otp_whatsapp');

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
                functionVersion: FUNCTION_VERSION,
                details: {
                  instanceName,
                  apiUrl: apiUrl.replace(/\/+$/, ''),
                  hint: 'Recrie ou reconecte a instância OTP no painel SaaS Admin'
                }
              }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } else if (!status.connected) {
        console.log(`[OTP] Instância OTP global desconectada (state: ${status.state}), buscando fallback...`);
        
        await supabase
          .from('system_config')
          .update({
            value: { ...otpConfig?.value, status: 'disconnected' },
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'otp_whatsapp');

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
              functionVersion: FUNCTION_VERSION,
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
            functionVersion: FUNCTION_VERSION,
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
          error_code: 'DB_INSERT_ERROR',
          functionVersion: FUNCTION_VERSION,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mensagem do código OTP
    const message = `🔐 *Código de Verificação*\n\nSeu código de acesso é: *${code}*\n\nEste código expira em 5 minutos.\n\n_Se você não solicitou este código, ignore esta mensagem._`;

    // Tentar enviar via Evolution API
    let sendResult = await sendViaEvolution(apiUrl, apiKey, instanceName, formattedPhone, message);

    // Se falhou com erro de instância, tentar fallback no momento do envio
    if (!sendResult.success) {
      const errorLower = (sendResult.error || '').toLowerCase();
      const isInstanceError = errorLower.includes('not found') || 
                              errorLower.includes('nenhuma instância') || 
                              errorLower.includes('não encontrada') ||
                              sendResult.httpStatus === 404;

      if (isInstanceError && !usedFallback) {
        console.log('[OTP] Erro de instância no envio, tentando fallback...');
        
        const fallback = await findFallbackInstance(supabase, globalApiUrl, globalApiKey);
        
        if (fallback) {
          console.log(`[OTP] Retentando com fallback: ${fallback.instanceName}`);
          sendResult = await sendViaEvolution(fallback.apiUrl, fallback.apiKey, fallback.instanceName, formattedPhone, message);
          
          if (sendResult.success) {
            instanceName = fallback.instanceName;
            usedFallback = true;
            fallbackBarbershopId = fallback.barbershopId;
          }
        }
      }
    }

    if (!sendResult.success) {
      console.error('[OTP] Erro ao enviar WhatsApp:', sendResult);

      // Deletar o código OTP já que falhou
      await supabase
        .from('auth_otp_codes')
        .delete()
        .eq('phone', formattedPhone)
        .eq('code', code);

      await logFailure(supabase, formattedPhone, sendResult.error || 'Erro desconhecido', instanceName, usedFallback);

      let errorCode = 'EVOLUTION_SEND_ERROR';
      const errorLower = (sendResult.error || '').toLowerCase();
      if (errorLower.includes('not found') || errorLower.includes('não encontrada') || errorLower.includes('nenhuma instância')) {
        errorCode = 'INSTANCE_NOT_FOUND_ON_SEND';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: sendResult.error,
          error_code: errorCode,
          functionVersion: FUNCTION_VERSION,
          details: {
            httpStatus: sendResult.httpStatus,
            endpoint: `${apiUrl.replace(/\/+$/, '')}/message/sendText/${instanceName}`,
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
        functionVersion: FUNCTION_VERSION,
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
        error_code: 'INTERNAL_ERROR',
        functionVersion: FUNCTION_VERSION,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
