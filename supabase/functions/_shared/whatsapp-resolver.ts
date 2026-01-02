/**
 * WhatsApp Resolver - Biblioteca compartilhada para resolução de configuração WhatsApp
 * 
 * Hierarquia de prioridade:
 * 1. Configuração específica da barbearia (whatsapp_config)
 * 2. Configuração global (system_config.evolution_api + system_config.otp_whatsapp)
 * 
 * @version 2025-01-02.resolver-v1
 */

export const RESOLVER_VERSION = '2025-01-02.resolver-v1';

// Types
export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  source: 'barbershop' | 'global';
  barbershopId?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  instanceUsed?: string;
  source?: 'barbershop' | 'global';
}

export interface HealthResult {
  connected: boolean;
  state: string;
  ownerJid?: string;
  phoneNumber?: string;
}

export interface ResolveOptions {
  requireConnected?: boolean; // Se true, verifica se instância está conectada
  skipHealthCheck?: boolean;  // Se true, não verifica saúde da instância
}

// Helper: Formatar número de telefone
export function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (!formatted.startsWith('55') && formatted.length <= 11) {
    formatted = '55' + formatted;
  }
  return formatted;
}

// Helper: Verificar saúde de uma instância
export async function checkInstanceHealth(
  config: WhatsAppConfig
): Promise<HealthResult> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  
  try {
    console.log(`[whatsapp-resolver] Checking health: ${config.instanceName}`);
    
    const response = await fetch(`${apiUrl}/instance/connectionState/${config.instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Instância pode não existir
      if (response.status === 404) {
        return { connected: false, state: 'not_found' };
      }
      return { connected: false, state: 'error' };
    }

    const data = await response.json();
    const state = data?.state || data?.instance?.state || 'unknown';
    const ownerJid = data?.instance?.ownerJid || data?.ownerJid;
    const phoneNumber = ownerJid ? ownerJid.split('@')[0] : undefined;
    
    console.log(`[whatsapp-resolver] Instance ${config.instanceName} state: ${state}`);
    
    return {
      connected: state === 'open',
      state,
      ownerJid,
      phoneNumber
    };
  } catch (error) {
    console.error(`[whatsapp-resolver] Health check error:`, error);
    return { connected: false, state: 'error' };
  }
}

// Helper: Buscar todas as instâncias do Evolution
export async function fetchAllInstances(
  apiUrl: string,
  apiKey: string
): Promise<{ name: string; state: string; ownerJid?: string }[]> {
  const cleanUrl = apiUrl.replace(/\/$/, '');
  
  try {
    const response = await fetch(`${cleanUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[whatsapp-resolver] fetchInstances failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const instances: { name: string; state: string; ownerJid?: string }[] = [];

    // Handle different response formats
    if (Array.isArray(data)) {
      for (const inst of data) {
        instances.push({
          name: inst.instanceName || inst.name || inst.instance?.instanceName || '',
          state: inst.connectionStatus || inst.state || inst.instance?.state || 'unknown',
          ownerJid: inst.ownerJid || inst.instance?.ownerJid
        });
      }
    } else if (typeof data === 'object') {
      Object.values(data).forEach((inst: any) => {
        if (inst && typeof inst === 'object' && (inst.instanceName || inst.name)) {
          instances.push({
            name: inst.instanceName || inst.name || '',
            state: inst.connectionStatus || inst.state || 'unknown',
            ownerJid: inst.ownerJid
          });
        }
      });
    }

    console.log(`[whatsapp-resolver] Found ${instances.length} instances`);
    return instances;
  } catch (error) {
    console.error(`[whatsapp-resolver] fetchInstances error:`, error);
    return [];
  }
}

/**
 * Resolve qual configuração WhatsApp usar
 * 
 * @param supabase - Cliente Supabase
 * @param barbershopId - ID da barbearia (opcional, se não fornecido usa global)
 * @param options - Opções de resolução
 */
export async function resolveWhatsAppConfig(
  supabase: any,
  barbershopId?: string | null,
  options: ResolveOptions = {}
): Promise<WhatsAppConfig | null> {
  const { requireConnected = false, skipHealthCheck = false } = options;
  
  console.log(`[whatsapp-resolver] Resolving config for barbershop: ${barbershopId || 'GLOBAL'}`);

  // 1. Se barbershopId fornecido, tentar config específica da barbearia
  if (barbershopId) {
    const { data: barbershopConfig, error: bbError } = await supabase
      .from('whatsapp_config')
      .select('config, is_active')
      .eq('barbershop_id', barbershopId)
      .eq('provider', 'evolution')
      .eq('is_active', true)
      .maybeSingle();

    if (!bbError && barbershopConfig?.config) {
      const cfg = barbershopConfig.config;
      
      // Barbearia pode ter config própria ou herdar da global
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
        const config: WhatsAppConfig = {
          apiUrl,
          apiKey,
          instanceName,
          source: 'barbershop',
          barbershopId
        };

        // Verificar se está conectada se necessário
        if (requireConnected && !skipHealthCheck) {
          const health = await checkInstanceHealth(config);
          if (!health.connected) {
            console.log(`[whatsapp-resolver] Barbershop instance not connected, trying global`);
            // Continua para tentar global
          } else {
            console.log(`[whatsapp-resolver] Using barbershop config: ${instanceName}`);
            return config;
          }
        } else {
          console.log(`[whatsapp-resolver] Using barbershop config: ${instanceName}`);
          return config;
        }
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
    console.log(`[whatsapp-resolver] No global Evolution API configured`);
    return null;
  }

  // Para OTP e notificações sem barbearia, usar instância OTP global
  const instanceName = globalOtp?.value?.instance_name;
  
  if (!instanceName) {
    console.log(`[whatsapp-resolver] No global OTP instance configured`);
    return null;
  }

  const config: WhatsAppConfig = {
    apiUrl: globalEvolution.value.api_url,
    apiKey: globalEvolution.value.api_key,
    instanceName,
    source: 'global'
  };

  // Verificar conexão se necessário
  if (requireConnected && !skipHealthCheck) {
    const health = await checkInstanceHealth(config);
    if (!health.connected) {
      console.log(`[whatsapp-resolver] Global instance not connected`);
      return null;
    }
  }

  console.log(`[whatsapp-resolver] Using global config: ${instanceName}`);
  return config;
}

/**
 * Encontrar uma instância conectada como fallback
 */
export async function findConnectedFallback(
  supabase: any,
  excludeInstanceName?: string
): Promise<WhatsAppConfig | null> {
  console.log(`[whatsapp-resolver] Searching for connected fallback instance`);

  // Buscar config global primeiro
  const { data: globalEvolution } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'evolution_api')
    .maybeSingle();

  if (!globalEvolution?.value?.api_url || !globalEvolution?.value?.api_key) {
    return null;
  }

  const apiUrl = globalEvolution.value.api_url;
  const apiKey = globalEvolution.value.api_key;

  // Buscar todas as instâncias do Evolution
  const instances = await fetchAllInstances(apiUrl, apiKey);
  
  // Encontrar uma que esteja conectada
  for (const inst of instances) {
    if (inst.state === 'open' && inst.name !== excludeInstanceName) {
      console.log(`[whatsapp-resolver] Found fallback instance: ${inst.name}`);
      return {
        apiUrl,
        apiKey,
        instanceName: inst.name,
        source: 'global'
      };
    }
  }

  console.log(`[whatsapp-resolver] No fallback instance found`);
  return null;
}

/**
 * Enviar mensagem WhatsApp
 */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string,
  options: {
    supabase?: any;
    barbershopId?: string;
    messageType?: string;
    recipientName?: string;
    appointmentId?: string;
    createdBy?: string;
  } = {}
): Promise<SendResult> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  const phoneNumber = formatPhoneNumber(to);
  
  console.log(`[whatsapp-resolver] Sending message to ${phoneNumber} via ${config.instanceName}`);

  try {
    const response = await fetch(`${apiUrl}/message/sendText/${config.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message
      })
    });

    const responseData = await response.json();
    
    // Verificar erro de instância não encontrada
    if (!response.ok) {
      const errorMsg = responseData?.message || responseData?.error || JSON.stringify(responseData);
      const isInstanceError = 
        errorMsg.includes('instance') || 
        errorMsg.includes('Nenhuma instância') ||
        errorMsg.includes('not found') ||
        response.status === 404;

      console.error(`[whatsapp-resolver] Send failed:`, errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        errorCode: isInstanceError ? 'INSTANCE_ERROR' : 'SEND_FAILED',
        instanceUsed: config.instanceName,
        source: config.source
      };
    }

    const messageId = responseData?.key?.id || responseData?.messageId || responseData?.id;
    console.log(`[whatsapp-resolver] Message sent successfully: ${messageId}`);

    // Log no banco se supabase fornecido
    if (options.supabase && options.barbershopId) {
      try {
        await options.supabase.from('whatsapp_logs').insert({
          barbershop_id: options.barbershopId,
          recipient_phone: phoneNumber,
          recipient_name: options.recipientName || 'Desconhecido',
          message_content: message,
          message_type: options.messageType || 'notification',
          status: 'sent',
          provider: 'evolution',
          whatsapp_message_id: messageId,
          appointment_id: options.appointmentId,
          created_by: options.createdBy,
          response_data: responseData
        });
      } catch (logError) {
        console.error(`[whatsapp-resolver] Error logging message:`, logError);
      }
    }

    return {
      success: true,
      messageId,
      instanceUsed: config.instanceName,
      source: config.source
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[whatsapp-resolver] Send exception:`, error);
    
    // Log falha se supabase fornecido
    if (options.supabase && options.barbershopId) {
      try {
        await options.supabase.from('whatsapp_logs').insert({
          barbershop_id: options.barbershopId,
          recipient_phone: phoneNumber,
          recipient_name: options.recipientName || 'Desconhecido',
          message_content: message,
          message_type: options.messageType || 'notification',
          status: 'failed',
          provider: 'evolution',
          error_message: errorMsg,
          appointment_id: options.appointmentId,
          created_by: options.createdBy
        });
      } catch (logError) {
        console.error(`[whatsapp-resolver] Error logging failure:`, logError);
      }
    }

    return {
      success: false,
      error: errorMsg,
      errorCode: 'EXCEPTION',
      instanceUsed: config.instanceName,
      source: config.source
    };
  }
}

/**
 * Enviar mensagem com fallback automático
 * Tenta enviar, se falhar com erro de instância, tenta fallback
 */
export async function sendWithFallback(
  supabase: any,
  barbershopId: string | null,
  to: string,
  message: string,
  options: {
    messageType?: string;
    recipientName?: string;
    appointmentId?: string;
    createdBy?: string;
  } = {}
): Promise<SendResult> {
  // Resolver configuração
  const config = await resolveWhatsAppConfig(supabase, barbershopId, { 
    requireConnected: true 
  });

  if (!config) {
    // Tentar fallback direto
    const fallback = await findConnectedFallback(supabase);
    if (!fallback) {
      return {
        success: false,
        error: 'Nenhuma configuração WhatsApp disponível',
        errorCode: 'NO_CONFIG'
      };
    }
    
    return sendWhatsAppMessage(fallback, to, message, {
      supabase,
      barbershopId: barbershopId || undefined,
      ...options
    });
  }

  // Tentar enviar
  const result = await sendWhatsAppMessage(config, to, message, {
    supabase,
    barbershopId: barbershopId || undefined,
    ...options
  });

  // Se falhou com erro de instância, tentar fallback
  if (!result.success && result.errorCode === 'INSTANCE_ERROR') {
    console.log(`[whatsapp-resolver] Primary send failed, trying fallback`);
    
    const fallback = await findConnectedFallback(supabase, config.instanceName);
    if (fallback) {
      return sendWhatsAppMessage(fallback, to, message, {
        supabase,
        barbershopId: barbershopId || undefined,
        ...options
      });
    }
  }

  return result;
}

/**
 * Diagnóstico completo do sistema WhatsApp
 */
export async function diagnoseWhatsApp(
  supabase: any,
  barbershopId?: string | null
): Promise<{
  resolverVersion: string;
  globalConfig: {
    evolutionApiConfigured: boolean;
    apiUrl?: string;
    otpInstanceConfigured: boolean;
    otpInstanceName?: string;
  };
  barbershopConfig?: {
    hasOwnConfig: boolean;
    instanceName?: string;
    isActive: boolean;
  };
  resolvedConfig: WhatsAppConfig | null;
  instanceHealth: HealthResult | null;
  allInstances: { name: string; state: string }[];
}> {
  console.log(`[whatsapp-resolver] Running diagnostics`);

  // Buscar configs
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

  let barbershopConfigData = null;
  if (barbershopId) {
    const { data } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('provider', 'evolution')
      .maybeSingle();
    barbershopConfigData = data;
  }

  // Resolver config
  const resolvedConfig = await resolveWhatsAppConfig(supabase, barbershopId, { skipHealthCheck: true });

  // Verificar saúde se temos config
  let instanceHealth: HealthResult | null = null;
  if (resolvedConfig) {
    instanceHealth = await checkInstanceHealth(resolvedConfig);
  }

  // Buscar todas as instâncias
  let allInstances: { name: string; state: string }[] = [];
  if (globalEvolution?.value?.api_url && globalEvolution?.value?.api_key) {
    allInstances = await fetchAllInstances(
      globalEvolution.value.api_url,
      globalEvolution.value.api_key
    );
  }

  return {
    resolverVersion: RESOLVER_VERSION,
    globalConfig: {
      evolutionApiConfigured: !!(globalEvolution?.value?.api_url && globalEvolution?.value?.api_key),
      apiUrl: globalEvolution?.value?.api_url,
      otpInstanceConfigured: !!globalOtp?.value?.instance_name,
      otpInstanceName: globalOtp?.value?.instance_name
    },
    barbershopConfig: barbershopId ? {
      hasOwnConfig: !!barbershopConfigData,
      instanceName: barbershopConfigData?.config?.instance_name,
      isActive: barbershopConfigData?.is_active || false
    } : undefined,
    resolvedConfig,
    instanceHealth,
    allInstances: allInstances.map(i => ({ name: i.name, state: i.state }))
  };
}
