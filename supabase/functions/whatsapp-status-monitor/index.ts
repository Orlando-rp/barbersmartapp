import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      const { data: emailConfig } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "email_alert")
        .single();

      if (emailConfig?.value?.enabled && emailConfig?.value?.recipients?.length > 0) {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          try {
            const statusEmoji = newStatus === 'connected' ? '✅' : '❌';
            const subject = `${statusEmoji} WhatsApp OTP ${newStatus === 'connected' ? 'Conectado' : 'Desconectado'}`;
            
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: emailConfig.value.from_email || "noreply@resend.dev",
                to: emailConfig.value.recipients,
                subject,
                html: `
                  <h2>Status do WhatsApp OTP Alterado</h2>
                  <p><strong>Status anterior:</strong> ${previousStatus || 'desconhecido'}</p>
                  <p><strong>Novo status:</strong> ${newStatus}</p>
                  <p><strong>Instância:</strong> ${instanceName}</p>
                  <p><strong>Data/Hora:</strong> ${new Date(now).toLocaleString('pt-BR')}</p>
                `,
              }),
            });
            console.log("[whatsapp-status-monitor] Alert email sent");
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
