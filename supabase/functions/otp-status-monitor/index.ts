import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAlertConfig {
  enabled: boolean;
  provider: 'resend' | 'smtp';
  resend_api_key: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  alert_emails: string;
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

// Send email via Resend API
const sendViaResend = async (
  apiKey: string,
  to: string[],
  subject: string,
  html: string
) => {
  console.log("[email] Sending via Resend to:", to);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "BarberSmart <alertas@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }

  return await response.json();
};

// Send email via SMTP
const sendViaSmtp = async (
  config: EmailAlertConfig,
  to: string[],
  subject: string,
  html: string
) => {
  console.log("[email] Sending via SMTP to:", to);
  console.log("[email] SMTP host:", config.smtp_host, "port:", config.smtp_port);
  
  const client = new SmtpClient();

  try {
    // Connect based on security setting
    if (config.smtp_secure && config.smtp_port === 465) {
      await client.connectTLS({
        hostname: config.smtp_host,
        port: config.smtp_port,
        username: config.smtp_user,
        password: config.smtp_password,
      });
    } else {
      await client.connect({
        hostname: config.smtp_host,
        port: config.smtp_port,
        username: config.smtp_user,
        password: config.smtp_password,
      });
      
      // STARTTLS for port 587
      if (config.smtp_secure) {
        await client.starttls();
      }
    }

    await client.send({
      from: `${config.smtp_from_name} <${config.smtp_from_email}>`,
      to: to,
      subject,
      content: html.replace(/<[^>]*>/g, ''), // Plain text fallback
      html,
    });

    console.log("[email] SMTP email sent successfully");
  } finally {
    await client.close();
  }
};

// Unified email sender
const sendAlertEmail = async (
  emailConfig: EmailAlertConfig,
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

  if (emailConfig.provider === 'smtp') {
    await sendViaSmtp(emailConfig, emails, subject, html);
  } else {
    await sendViaResend(emailConfig.resend_api_key, emails, subject, html);
  }
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
      .in('key', ['email_alerts', 'evolution_api', 'otp_whatsapp']);

    const emailConfig = configs?.find(c => c.key === 'email_alerts')?.value as EmailAlertConfig | undefined;
    const evolutionConfig = configs?.find(c => c.key === 'evolution_api')?.value as EvolutionConfig | undefined;
    const otpConfig = configs?.find(c => c.key === 'otp_whatsapp')?.value as OtpConfig | undefined;

    // Handle test email action
    if (body.action === 'test-email') {
      if (!emailConfig?.alert_emails) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Configure os emails de destino primeiro" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate provider-specific config
      if (emailConfig.provider === 'smtp') {
        if (!emailConfig.smtp_host || !emailConfig.smtp_user || !emailConfig.smtp_password || !emailConfig.smtp_from_email) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Configure o servidor SMTP completamente" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        if (!emailConfig.resend_api_key) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Configure a API Key do Resend" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const emails = emailConfig.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
      
      await sendAlertEmail(
        emailConfig,
        emails,
        otpConfig?.instance_name || 'barbersmart-otp',
        'disconnected'
      );

      return new Response(JSON.stringify({ success: true, provider: emailConfig.provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    
    // Check if email config is valid for the chosen provider
    const canSendEmail = emailConfig.provider === 'smtp' 
      ? (emailConfig.smtp_host && emailConfig.smtp_user && emailConfig.smtp_password && emailConfig.smtp_from_email)
      : emailConfig.resend_api_key;
    
    const shouldSendAlert = statusChanged && canSendEmail && emailConfig.alert_emails;

    // Check cooldown
    let withinCooldown = false;
    if (emailConfig.last_alert_sent) {
      const lastAlert = new Date(emailConfig.last_alert_sent);
      const cooldownMs = (emailConfig.cooldown_minutes || 15) * 60 * 1000;
      withinCooldown = (Date.now() - lastAlert.getTime()) < cooldownMs;
    }

    // Send alert if needed
    if (shouldSendAlert && !withinCooldown) {
      console.log(`Enviando alerta de ${currentStatus === 'connected' ? 'reconexão' : 'desconexão'} via ${emailConfig.provider}`);
      
      const emails = emailConfig.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
      
      try {
        await sendAlertEmail(
          emailConfig,
          emails,
          otpConfig.instance_name,
          currentStatus
        );

        // Update last alert sent
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

        console.log("Alerta enviado com sucesso");
      } catch (error) {
        console.error("Erro ao enviar alerta:", error);
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
      provider: emailConfig.provider,
      alertSent: shouldSendAlert && !withinCooldown,
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