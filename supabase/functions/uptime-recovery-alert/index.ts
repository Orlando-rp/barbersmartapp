import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BarberSmart Recovery Alert
 * 
 * Envia notificação quando um serviço que estava offline volta ao normal.
 * Chamado pelo uptime-monitor quando detecta recuperação.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryPayload {
  endpoint: string;
  previousStatus: string;
  currentStatus: string;
  downtime: string; // Duração do tempo offline
  responseTime: number;
}

async function sendRecoveryEmail(
  payload: RecoveryPayload,
  alertEmail: string,
  resendApiKey: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .metric { display: inline-block; background: #e5e7eb; padding: 8px 16px; border-radius: 4px; margin: 5px; }
        .success-box { background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">✅ Sistema Recuperado</h1>
          <p style="margin:10px 0 0;">BarberSmart Uptime Monitor</p>
        </div>
        <div class="content">
          <div class="success-box">
            <h2 style="margin:0;color:#16a34a;">🎉 Serviço Normalizado</h2>
            <p style="margin:10px 0 0;"><strong>${payload.endpoint}</strong> está online novamente!</p>
          </div>
          
          <h3>📊 Detalhes da Recuperação</h3>
          <p>
            <span class="metric">⏱️ Tempo offline: ${payload.downtime}</span>
            <span class="metric">📡 Tempo de resposta: ${payload.responseTime}ms</span>
          </p>
          
          <p style="margin-top:20px;">
            O serviço que estava <strong style="color:#dc2626;">${payload.previousStatus}</strong> agora está 
            <strong style="color:#16a34a;">${payload.currentStatus}</strong>.
          </p>

          <p style="color:#6b7280;font-size:13px;margin-top:30px;">
            Recuperação detectada em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const emails = alertEmail.split(",").map((e) => e.trim());
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BarberSmart Monitor <monitor@resend.dev>",
        to: emails,
        subject: `✅ Recuperado: ${payload.endpoint} - BarberSmart`,
        html: htmlContent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Erro ao enviar email de recuperação:", error);
    return false;
  }
}

async function sendRecoveryWhatsApp(
  payload: RecoveryPayload,
  alertPhone: string,
  whatsappToken: string,
  whatsappPhoneId: string
): Promise<boolean> {
  const message = `✅ *RECUPERADO: Sistema Online*

📊 *BarberSmart Uptime Monitor*
⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}

🎉 *${payload.endpoint}* está funcionando normalmente!

📈 *Detalhes:*
• Tempo offline: ${payload.downtime}
• Tempo de resposta: ${payload.responseTime}ms
• Status anterior: ${payload.previousStatus}
• Status atual: ${payload.currentStatus}`;

  try {
    const phones = alertPhone.split(",").map((p) => p.trim().replace(/\D/g, ""));
    
    for (const phone of phones) {
      await fetch(
        `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: message },
          }),
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp de recuperação:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RecoveryPayload = await req.json();

    const alertEmail = Deno.env.get("ALERT_EMAIL");
    const alertWhatsApp = Deno.env.get("ALERT_WHATSAPP");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    let emailSent = false;
    let whatsappSent = false;

    if (alertEmail && resendApiKey) {
      emailSent = await sendRecoveryEmail(payload, alertEmail, resendApiKey);
    }

    if (alertWhatsApp && whatsappToken && whatsappPhoneId) {
      whatsappSent = await sendRecoveryWhatsApp(
        payload,
        alertWhatsApp,
        whatsappToken,
        whatsappPhoneId
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, whatsappSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no recovery alert:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
