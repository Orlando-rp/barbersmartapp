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
  api_url?: string;
  api_key?: string;
  apiUrl?: string;
  apiKey?: string;
}

interface OtpConfig {
  instance_name?: string;
  instanceName?: string;
  status?: string;
  phone_number?: string;
  last_check?: string;
  last_status_change?: string;
}

interface ServerStatus {
  status: 'online' | 'offline';
  api_url?: string;
  last_check: string;
  response_time_ms?: number;
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
  
  const client = new SmtpClient();

  try {
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
      
      if (config.smtp_secure) {
        await client.starttls();
      }
    }

    await client.send({
      from: `${config.smtp_from_name} <${config.smtp_from_email}>`,
      to: to,
      subject,
      content: html.replace(/<[^>]*>/g, ''),
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
  to: string[],
  subject: string,
  html: string
) => {
  if (emailConfig.provider === 'smtp') {
    await sendViaSmtp(emailConfig, to, subject, html);
  } else {
    await sendViaResend(emailConfig.resend_api_key, to, subject, html);
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[whatsapp-status-monitor] Starting status check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load Evolution API config
    const { data: evolutionData, error: evolutionError } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "evolution_api")
      .single();

    if (evolutionError || !evolutionData?.value) {
      console.log("[whatsapp-status-monitor] Evolution API not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evolutionConfig = evolutionData.value as EvolutionConfig;
    const apiUrl = evolutionConfig.api_url || evolutionConfig.apiUrl;
    const apiKey = evolutionConfig.api_key || evolutionConfig.apiKey;

    if (!apiUrl || !apiKey) {
      console.log("[whatsapp-status-monitor] Missing API URL or Key");
      return new Response(
        JSON.stringify({ success: false, error: "Missing API URL or Key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    let serverOnline = false;
    let serverResponseTime = 0;

    // Check Evolution server status
    try {
      const startTime = Date.now();
      const serverResponse = await fetch(apiUrl, {
        method: "GET",
        headers: { apikey: apiKey },
      });
      serverResponseTime = Date.now() - startTime;
      serverOnline = serverResponse.ok;
      console.log(`[whatsapp-status-monitor] Server check: ${serverOnline ? 'online' : 'offline'} (${serverResponseTime}ms)`);
    } catch (error) {
      console.error("[whatsapp-status-monitor] Server check failed:", error);
      serverOnline = false;
    }

    // Save server status
    const serverStatus: ServerStatus = {
      status: serverOnline ? 'online' : 'offline',
      api_url: apiUrl,
      last_check: now,
      response_time_ms: serverResponseTime,
    };

    await supabase
      .from("system_config")
      .upsert({
        key: "evolution_server_status",
        value: serverStatus,
        updated_at: now,
      }, { onConflict: "key" });

    console.log("[whatsapp-status-monitor] Server status saved");

    // Load OTP config
    const { data: otpData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "otp_whatsapp")
      .single();

    const otpConfig = (otpData?.value || {}) as OtpConfig;
    const instanceName = otpConfig.instance_name || otpConfig.instanceName;

    let otpConnected = false;
    let otpPhoneNumber = otpConfig.phone_number;
    const previousStatus = otpConfig.status;

    if (instanceName && serverOnline) {
      // Check OTP instance status
      try {
        const stateResponse = await fetch(
          `${apiUrl}/instance/connectionState/${instanceName}`,
          {
            method: "GET",
            headers: { apikey: apiKey },
          }
        );

        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          otpConnected = stateData?.instance?.state === "open";
          console.log(`[whatsapp-status-monitor] OTP instance state: ${stateData?.instance?.state}`);

          // Try to get phone number if connected
          if (otpConnected) {
            try {
              const infoResponse = await fetch(
                `${apiUrl}/instance/fetchInstances`,
                {
                  method: "GET",
                  headers: { apikey: apiKey },
                }
              );
              if (infoResponse.ok) {
                const instances = await infoResponse.json();
                const otpInstance = instances.find((i: any) => i.instance?.instanceName === instanceName);
                if (otpInstance?.instance?.owner) {
                  otpPhoneNumber = otpInstance.instance.owner.replace("@s.whatsapp.net", "");
                }
              }
            } catch (e) {
              console.log("[whatsapp-status-monitor] Could not fetch phone number");
            }
          }
        }
      } catch (error) {
        console.error("[whatsapp-status-monitor] OTP check failed:", error);
        otpConnected = false;
      }
    }

    const newStatus = otpConnected ? 'connected' : 'disconnected';
    const statusChanged = previousStatus !== newStatus;

    // Save OTP status
    const updatedOtpConfig: OtpConfig = {
      instance_name: instanceName || 'otp-auth-global',
      status: newStatus,
      phone_number: otpPhoneNumber,
      last_check: now,
      last_status_change: statusChanged ? now : (otpConfig.last_status_change || now),
    };

    await supabase
      .from("system_config")
      .upsert({
        key: "otp_whatsapp",
        value: updatedOtpConfig,
        updated_at: now,
      }, { onConflict: "key" });

    console.log(`[whatsapp-status-monitor] OTP status saved: ${newStatus}`);

    // Check if we should send email alert (status changed)
    if (statusChanged) {
      console.log(`[whatsapp-status-monitor] Status changed from ${previousStatus} to ${newStatus}`);
      
      // Load email alert config
      const { data: emailConfigData } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "email_alerts")
        .single();

      const emailConfig = emailConfigData?.value as EmailAlertConfig | undefined;

      if (emailConfig?.enabled && emailConfig?.alert_emails) {
        // Check if provider config is valid
        const canSendEmail = emailConfig.provider === 'smtp'
          ? (emailConfig.smtp_host && emailConfig.smtp_user && emailConfig.smtp_password && emailConfig.smtp_from_email)
          : emailConfig.resend_api_key;

        if (canSendEmail) {
          try {
            const statusEmoji = newStatus === 'connected' ? '✅' : '❌';
            const subject = `${statusEmoji} WhatsApp OTP ${newStatus === 'connected' ? 'Conectado' : 'Desconectado'}`;
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Status do WhatsApp OTP Alterado</h2>
                <p><strong>Status anterior:</strong> ${previousStatus || 'desconhecido'}</p>
                <p><strong>Novo status:</strong> ${newStatus}</p>
                <p><strong>Instância:</strong> ${instanceName}</p>
                <p><strong>Data/Hora:</strong> ${new Date(now).toLocaleString('pt-BR')}</p>
              </div>
            `;
            
            const emails = emailConfig.alert_emails.split(',').map(e => e.trim()).filter(Boolean);
            await sendAlertEmail(emailConfig, emails, subject, html);
            
            console.log(`[whatsapp-status-monitor] Alert email sent via ${emailConfig.provider}`);
          } catch (emailError) {
            console.error("[whatsapp-status-monitor] Failed to send alert email:", emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        server: serverStatus,
        otp: {
          status: newStatus,
          instance_name: instanceName,
          status_changed: statusChanged,
        },
        checked_at: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[whatsapp-status-monitor] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});