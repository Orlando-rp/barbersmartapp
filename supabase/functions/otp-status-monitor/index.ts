import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAlertConfig {
  enabled: boolean;
  resend_api_key: string;
  alert_emails: string;
  whatsapp_enabled: boolean;
  whatsapp_numbers: string;
  cooldown_minutes: number;
  last_alert_sent: string | null;
}

interface EvolutionConfig {
  api_url: string;
  api_key: string;
}

interface OtpConfig {
  instance_name: string;
  status: string;
  phone_number?: string;
  last_check?: string;
  last_disconnect?: string;
}

const sendAlertEmail = async (
  resendApiKey: string,
  emails: string[],
  instanceName: string,
  status: string
) => {
  const isRecovery = status === 'connected';
  const subject = isRecovery 
    ? `✅ [BarberSmart] Instância OTP reconectada`
    : `🚨 [BarberSmart] ALERTA: Instância OTP desconectada`;
  
  const html = isRecovery ? `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">✅ Instância OTP Reconectada</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151;">
          A instância global OTP WhatsApp <strong>${instanceName}</strong> foi reconectada com sucesso.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          O serviço de login por WhatsApp está funcionando normalmente.
        </p>
        <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px;">
          <p style="margin: 0; color: #065f46;">
            <strong>Status:</strong> Conectado<br>
            <strong>Horário:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      </div>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🚨 Alerta de Desconexão OTP</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #374151;">
          A instância global OTP WhatsApp <strong>${instanceName}</strong> foi desconectada.
        </p>
        <p style="font-size: 16px; color: #dc2626; font-weight: bold;">
          ⚠️ O login por WhatsApp pode estar indisponível!
        </p>
        <div style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px;">
          <p style="margin: 0; color: #991b1b;">
            <strong>Status:</strong> Desconectado<br>
            <strong>Horário da detecção:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
        <div style="margin-top: 20px;">
          <h3 style="color: #374151;">O que fazer:</h3>
          <ol style="color: #4b5563; padding-left: 20px;">
            <li>Acesse o painel SaaS Admin</li>
            <li>Vá para a aba "WhatsApp"</li>
            <li>Clique em "Conectar" na seção OTP WhatsApp Global</li>
            <li>Escaneie o QR Code com o celular</li>
          </ol>
        </div>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "BarberSmart <alertas@resend.dev>",
      to: emails,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao enviar email: ${error}`);
  }

  return await response.json();
};

const sendWhatsAppAlert = async (
  evolutionApiUrl: string,
  evolutionApiKey: string,
  alertInstanceName: string,
  numbers: string[],
  otpInstanceName: string,
  status: string
) => {
  const isRecovery = status === 'connected';
  const emoji = isRecovery ? '✅' : '🚨';
  const statusText = isRecovery ? 'RECONECTADA' : 'DESCONECTADA';
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  const message = isRecovery 
    ? `${emoji} *ALERTA BARBERSMART*\n\n` +
      `A instância OTP *${otpInstanceName}* foi *reconectada* com sucesso.\n\n` +
      `✅ Status: Conectado\n` +
      `🕐 Horário: ${timestamp}\n\n` +
      `O serviço de login por WhatsApp está funcionando normalmente.`
    : `${emoji} *ALERTA BARBERSMART*\n\n` +
      `⚠️ A instância OTP *${otpInstanceName}* foi *desconectada*!\n\n` +
      `❌ Status: Desconectado\n` +
      `🕐 Horário: ${timestamp}\n\n` +
      `*O login por WhatsApp pode estar indisponível!*\n\n` +
      `*O que fazer:*\n` +
      `1. Acesse o painel SaaS Admin\n` +
      `2. Vá para a aba "WhatsApp"\n` +
      `3. Clique em "Conectar" na seção OTP\n` +
      `4. Escaneie o QR Code`;

  const results = [];
  
  for (const number of numbers) {
    const cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber) continue;
    
    try {
      const response = await fetch(`${evolutionApiUrl}/message/sendText/${alertInstanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
        }),
      });

      if (response.ok) {
        results.push({ number: cleanNumber, success: true });
        console.log(`WhatsApp alert sent to ${cleanNumber}`);
      } else {
        const error = await response.text();
        results.push({ number: cleanNumber, success: false, error });
        console.error(`Failed to send WhatsApp to ${cleanNumber}: ${error}`);
      }
    } catch (error) {
      results.push({ number: cleanNumber, success: false, error: error.message });
      console.error(`Error sending WhatsApp to ${cleanNumber}:`, error);
    }
  }
  
  return results;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for manual actions
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Cron job may not send body
    }

    // Load configurations
    const { data: configs } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['email_alerts', 'evolution_api', 'otp_whatsapp', 'whatsapp_alert_instance']);

    const emailConfig = configs?.find(c => c.key === 'email_alerts')?.value as EmailAlertConfig | undefined;
    const evolutionConfig = configs?.find(c => c.key === 'evolution_api')?.value as EvolutionConfig | undefined;
    const otpConfig = configs?.find(c => c.key === 'otp_whatsapp')?.value as OtpConfig | undefined;
    const alertInstanceName = (configs?.find(c => c.key === 'whatsapp_alert_instance')?.value as { instance_name?: string })?.instance_name || 'barbersmart-alerts';

    // Handle test email action
    if (body.action === 'test-email') {
      if (!emailConfig?.resend_api_key || !emailConfig?.alert_emails) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Configure a API Key e emails primeiro" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emails = emailConfig.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
      
      await sendAlertEmail(
        emailConfig.resend_api_key,
        emails,
        otpConfig?.instance_name || 'barbersmart-otp',
        'disconnected'
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle test WhatsApp action
    if (body.action === 'test-whatsapp') {
      if (!emailConfig?.whatsapp_numbers) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Configure os números de WhatsApp primeiro" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!evolutionConfig?.api_url || !evolutionConfig?.api_key) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Evolution API não configurada" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const numbers = emailConfig.whatsapp_numbers.split(',').map(n => n.trim()).filter(Boolean);
      
      const results = await sendWhatsAppAlert(
        evolutionConfig.api_url,
        evolutionConfig.api_key,
        alertInstanceName,
        numbers,
        otpConfig?.instance_name || 'barbersmart-otp',
        'disconnected'
      );

      const allSuccess = results.every(r => r.success);
      
      return new Response(JSON.stringify({ 
        success: allSuccess,
        results,
        error: allSuccess ? undefined : "Algumas mensagens falharam"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Skip check if monitoring is disabled
    if (!emailConfig?.enabled) {
      console.log("Monitoramento de OTP desativado");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Monitoramento desativado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required configs
    if (!evolutionConfig?.api_url || !evolutionConfig?.api_key) {
      console.log("Evolution API não configurada");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Evolution API não configurada" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!otpConfig?.instance_name) {
      console.log("Instância OTP não configurada");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Instância OTP não configurada" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check instance status
    const statusUrl = `${evolutionConfig.api_url}/instance/connectionState/${otpConfig.instance_name}`;
    console.log(`Verificando status da instância: ${otpConfig.instance_name}`);

    const statusResponse = await fetch(statusUrl, {
      headers: {
        "apikey": evolutionConfig.api_key,
      },
    });

    let currentStatus = 'unknown';
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      currentStatus = statusData?.instance?.state === 'open' ? 'connected' : 'disconnected';
    } else {
      currentStatus = 'disconnected';
    }

    console.log(`Status atual: ${currentStatus}, Status anterior: ${otpConfig.status || 'unknown'}`);

    const previousStatus = otpConfig.status || 'unknown';
    const now = new Date().toISOString();
    
    // Update OTP config with check time
    const updatedOtpConfig: OtpConfig = {
      ...otpConfig,
      status: currentStatus,
      last_check: now,
    };

    // Check if status changed
    const statusChanged = previousStatus !== currentStatus && previousStatus !== 'unknown';
    const hasEmailConfig = emailConfig.resend_api_key && emailConfig.alert_emails;
    const hasWhatsAppConfig = emailConfig.whatsapp_enabled && emailConfig.whatsapp_numbers;
    const shouldSendAlert = statusChanged && (hasEmailConfig || hasWhatsAppConfig);

    // Check cooldown
    let withinCooldown = false;
    if (emailConfig.last_alert_sent) {
      const lastAlert = new Date(emailConfig.last_alert_sent);
      const cooldownMs = (emailConfig.cooldown_minutes || 15) * 60 * 1000;
      withinCooldown = (Date.now() - lastAlert.getTime()) < cooldownMs;
    }

    let emailSent = false;
    let whatsappSent = false;

    // Send alert if needed
    if (shouldSendAlert && !withinCooldown) {
      console.log(`Enviando alerta de ${currentStatus === 'connected' ? 'reconexão' : 'desconexão'}`);
      
      // Send Email Alert
      if (hasEmailConfig) {
        const emails = emailConfig.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
        
        try {
          await sendAlertEmail(
            emailConfig.resend_api_key,
            emails,
            otpConfig.instance_name,
            currentStatus
          );
          emailSent = true;
          console.log("Alerta por email enviado com sucesso");
        } catch (error) {
          console.error("Erro ao enviar alerta por email:", error);
        }
      }

      // Send WhatsApp Alert (backup)
      if (hasWhatsAppConfig) {
        const numbers = emailConfig.whatsapp_numbers.split(',').map(n => n.trim()).filter(Boolean);
        
        try {
          const results = await sendWhatsAppAlert(
            evolutionConfig.api_url,
            evolutionConfig.api_key,
            alertInstanceName,
            numbers,
            otpConfig.instance_name,
            currentStatus
          );
          whatsappSent = results.some(r => r.success);
          console.log("Alerta por WhatsApp enviado:", results);
        } catch (error) {
          console.error("Erro ao enviar alerta por WhatsApp:", error);
        }
      }

      // Update last alert sent if any alert was sent
      if (emailSent || whatsappSent) {
        await supabase
          .from('system_config')
          .upsert({
            key: 'email_alerts',
            value: {
              ...emailConfig,
              last_alert_sent: now,
            },
            updated_at: now,
          }, { onConflict: 'key' });
      }

      // Update disconnect time
      if (currentStatus === 'disconnected') {
        updatedOtpConfig.last_disconnect = now;
      } else {
        updatedOtpConfig.last_disconnect = undefined;
      }
    }

    // Save updated OTP config
    await supabase
      .from('system_config')
      .upsert({
        key: 'otp_whatsapp',
        value: updatedOtpConfig,
        updated_at: now,
      }, { onConflict: 'key' });

    return new Response(JSON.stringify({ 
      success: true, 
      status: currentStatus,
      previousStatus,
      alertSent: shouldSendAlert && !withinCooldown,
      emailSent,
      whatsappSent,
      withinCooldown,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no monitor OTP:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
