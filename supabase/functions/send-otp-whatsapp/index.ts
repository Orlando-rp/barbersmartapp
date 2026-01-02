// Edge Function para enviar código OTP via WhatsApp usando Evolution API
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Número de telefone é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar telefone - remover caracteres não numéricos
    let formattedPhone = phone.replace(/\D/g, '');
    
    // Adicionar código do país se não tiver
    if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log(`[Send OTP] Iniciando para telefone: ${formattedPhone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar rate limiting: máx 5 códigos por hora por telefone
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('auth_otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', formattedPhone)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 5) {
      console.log(`[Send OTP] Rate limit excedido para: ${formattedPhone}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas tentativas. Aguarde 1 hora antes de solicitar novo código.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        attempts: 0
      });

    if (insertError) {
      console.error('[Send OTP] Erro ao salvar código:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar código de verificação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração global da Evolution API
    const { data: evolutionConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'evolution_api')
      .maybeSingle();

    if (!evolutionConfig?.value?.api_url || !evolutionConfig?.value?.api_key) {
      console.error('[Send OTP] Evolution API não configurada globalmente');
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não configurado no sistema. Configure o servidor Evolution API no painel SaaS Admin.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl = evolutionConfig.value.api_url;
    let apiKey = evolutionConfig.value.api_key;

    // Buscar configuração da instância OTP global
    const { data: otpConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'otp_whatsapp')
      .maybeSingle();

    let instanceName = otpConfig?.value?.instance_name;
    const otpStatus = otpConfig?.value?.status;

    // Se não há instância OTP configurada, tentar usar instância de barbearia
    if (!instanceName) {
      console.log('[Send OTP] Instância OTP global não configurada, buscando instância alternativa...');

      // Buscar qualquer instância evolution ativa
      const { data: configs, error: configsError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('provider', 'evolution')
        .eq('is_active', true);

      if (configsError) {
        console.error('[Send OTP] Erro ao buscar whatsapp_config:', configsError);
      }

      console.log('[Send OTP] Configurações encontradas:', JSON.stringify(configs));

      // Filtrar para encontrar uma com instance_name
      const validConfig = configs?.find(c => c.config?.instance_name);

      if (!validConfig) {
        console.error('[Send OTP] Nenhuma instância WhatsApp conectada');
        
        // Delete the OTP record since we can't send
        await supabase
          .from('auth_otp_codes')
          .delete()
          .eq('phone', formattedPhone)
          .eq('code', code);
        
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Nenhuma instância WhatsApp disponível. Conecte a instância OTP global no painel SaaS Admin (Configurações > OTP WhatsApp) ou conecte o WhatsApp de alguma barbearia.',
            details: {
              otp_instance_configured: !!otpConfig?.value?.instance_name,
              otp_status: otpStatus || null,
              configs_found: configs?.length || 0,
            },
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fallbackConfig = validConfig.config as {
        api_url?: string;
        api_key?: string;
        instance_name: string;
      };

      instanceName = fallbackConfig.instance_name;
      apiUrl = fallbackConfig.api_url || apiUrl;
      apiKey = fallbackConfig.api_key || apiKey;

      console.log(`[Send OTP] Usando instância alternativa: ${instanceName}`);
    } else {
      if (otpStatus !== 'connected') {
        console.log(
          `[Send OTP] Instância OTP global com status "${otpStatus || 'unknown'}"; tentando enviar mesmo assim: ${instanceName}`
        );
      } else {
        console.log(`[Send OTP] Usando instância OTP global: ${instanceName}`);
      }
    }

    // Mensagem do código OTP
    const message = `🔐 *Código de Verificação*\n\nSeu código de acesso é: *${code}*\n\nEste código expira em 5 minutos.\n\n_Se você não solicitou este código, ignore esta mensagem._`;

    // Enviar via Evolution API
    const evolutionUrl = `${apiUrl.replace(/\/+$/, '')}/message/sendText/${instanceName}`;

    console.log(`[Send OTP] Chamando Evolution API: ${evolutionUrl}`);

    const response = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    });

    // Handle response - may be JSON or text/HTML
    const responseText = await response.text();
    let responseData: any = null;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText.substring(0, 500) };
    }

    if (!response.ok) {
      console.error('[Send OTP] Erro ao enviar WhatsApp:', { status: response.status, responseData });
      
      // Delete the OTP record since sending failed (avoid rate limit issues)
      await supabase
        .from('auth_otp_codes')
        .delete()
        .eq('phone', formattedPhone)
        .eq('code', code);
      
      console.log('[Send OTP] OTP deletado após falha de envio');

      const errorMessage = responseData?.error || responseData?.message || responseData?.raw || 'Erro ao enviar código via WhatsApp';
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: {
            status: response.status,
            endpoint: evolutionUrl,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Send OTP] Código enviado com sucesso para: ${formattedPhone}`);

    // Log the OTP attempt in whatsapp_logs
    try {
      await supabase
        .from('whatsapp_logs')
        .insert({
          barbershop_id: null,
          recipient_phone: formattedPhone,
          message_content: '[OTP] Código de verificação enviado',
          status: 'sent',
          provider: 'evolution',
          message_type: 'otp'
        });
    } catch (logError) {
      console.warn('[Send OTP] Erro ao registrar log (não crítico):', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado via WhatsApp',
        expiresAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Send OTP] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
