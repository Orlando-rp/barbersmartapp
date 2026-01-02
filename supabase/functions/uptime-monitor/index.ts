// Edge Function: uptime-monitor
// Version: 2.0.0 - Now uses custom SMTP from admin panel
// Last updated: 2026-01-02

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * BarberSmart Uptime Monitor
 * 
 * Verifica endpoints de saúde e envia alertas via Email/WhatsApp quando detecta problemas.
 * 
 * Configuração via system_config table:
 * - smtp_config: Configuração SMTP para envio de emails
 * 
 * Secrets opcionais (legacy):
 * - ALERT_EMAIL: Email(s) para receber alertas (separados por vírgula)
 * - ALERT_WHATSAPP: Telefone(s) para alertas WhatsApp (opcional)
 * - MAIN_DOMAIN: Domínio principal para monitorar (ex: barbersmart.app)
 * - WHATSAPP_API_TOKEN: Token da API do WhatsApp (opcional)
 * - WHATSAPP_PHONE_NUMBER_ID: ID do número do WhatsApp (opcional)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
}

interface HealthCheckResult {
  endpoint: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  statusCode: number | null;
  error?: string;
  timestamp: string;
}

interface MonitorConfig {
  endpoints: Array<{
    name: string;
    url: string;
    expectedStatus: number;
    timeout: number;
  }>;
  alertThreshold: number;
  cooldownMinutes: number;
}

// Configuração padrão dos endpoints a monitorar
function getDefaultConfig(mainDomain: string): MonitorConfig {
  return {
    endpoints: [
      {
        name: "Frontend Principal",
        url: `https://${mainDomain}/health`,
        expectedStatus: 200,
        timeout: 10000,
      },
      {
        name: "Frontend WWW",
        url: `https://www.${mainDomain}/health`,
        expectedStatus: 200,
        timeout: 10000,
      },
      {
        name: "API Supabase",
        url: `${Deno.env.get("SUPABASE_URL")}/rest/v1/`,
        expectedStatus: 200,
        timeout: 5000,
      },
    ],
    alertThreshold: 2,
    cooldownMinutes: 15,
  };
}

async function checkEndpoint(
  endpoint: { name: string; url: string; expectedStatus: number; timeout: number }
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

    const response = await fetch(endpoint.url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "BarberSmart-UptimeMonitor/2.0",
      },
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;

    // Determinar status
    let status: "healthy" | "degraded" | "down";
    if (statusCode === endpoint.expectedStatus) {
      if (responseTime > 3000) {
        status = "degraded";
      } else {
        status = "healthy";
      }
    } else if (statusCode >= 200 && statusCode < 400) {
      status = "degraded";
    } else {
      status = "down";
    }

    return {
      endpoint: endpoint.name,
      status,
      responseTime,
      statusCode,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      endpoint: endpoint.name,
      status: "down",
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp,
    };
  }
}

async function sendViaSmtp(
  smtpConfig: SmtpConfig, 
  to: string[], 
  subject: string, 
  html: string
): Promise<boolean> {
  console.log(`[SMTP] Sending alert to ${to.join(', ')}`);
  
  const client = new SMTPClient({
    connection: {
      hostname: smtpConfig.host,
      port: smtpConfig.port,
      tls: smtpConfig.secure,
      auth: {
        username: smtpConfig.user,
        password: smtpConfig.pass,
      },
    },
  });

  try {
    for (const recipient of to) {
      await client.send({
        from: `${smtpConfig.from_name} Monitor <${smtpConfig.from_email}>`,
        to: recipient,
        subject: subject,
        content: "auto",
        html: html,
      });
      console.log(`[SMTP] Alert sent to ${recipient}`);
    }
    return true;
  } catch (error: any) {
    console.error("[SMTP] Error sending alert:", error);
    return false;
  } finally {
    try {
      await client.close();
    } catch (e) {
      // Ignore close errors
    }
  }
}

function generateAlertEmailHtml(
  results: HealthCheckResult[],
  systemName: string
): { subject: string; html: string } {
  const downEndpoints = results.filter((r) => r.status === "down");
  const degradedEndpoints = results.filter((r) => r.status === "degraded");

  const subject = downEndpoints.length > 0
    ? `🚨 ALERTA: ${downEndpoints.length} serviço(s) OFFLINE - ${systemName}`
    : `⚠️ AVISO: ${degradedEndpoints.length} serviço(s) com lentidão - ${systemName}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${downEndpoints.length > 0 ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .status-card { background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid; }
        .status-down { border-left-color: #dc2626; }
        .status-degraded { border-left-color: #f59e0b; }
        .status-healthy { border-left-color: #16a34a; }
        .metric { display: inline-block; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
        .timestamp { color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">${downEndpoints.length > 0 ? "🚨 Sistema OFFLINE" : "⚠️ Lentidão Detectada"}</h1>
          <p style="margin:10px 0 0;">${systemName} Uptime Monitor</p>
        </div>
        <div class="content">
          ${downEndpoints.length > 0 ? `
            <h2>❌ Serviços Offline (${downEndpoints.length})</h2>
            ${downEndpoints.map((r) => `
              <div class="status-card status-down">
                <strong>${r.endpoint}</strong>
                <p style="margin:5px 0;">
                  <span class="metric">Status: ${r.statusCode || "Timeout"}</span>
                  <span class="metric">Tempo: ${r.responseTime}ms</span>
                </p>
                ${r.error ? `<p style="color:#dc2626;font-size:13px;">Erro: ${r.error}</p>` : ""}
              </div>
            `).join("")}
          ` : ""}
          
          ${degradedEndpoints.length > 0 ? `
            <h2>⚠️ Serviços com Lentidão (${degradedEndpoints.length})</h2>
            ${degradedEndpoints.map((r) => `
              <div class="status-card status-degraded">
                <strong>${r.endpoint}</strong>
                <p style="margin:5px 0;">
                  <span class="metric">Status: ${r.statusCode}</span>
                  <span class="metric">Tempo: ${r.responseTime}ms</span>
                </p>
              </div>
            `).join("")}
          ` : ""}

          <h2>✅ Serviços Saudáveis</h2>
          ${results.filter((r) => r.status === "healthy").map((r) => `
            <div class="status-card status-healthy">
              <strong>${r.endpoint}</strong>
              <span class="metric" style="float:right;">${r.responseTime}ms</span>
            </div>
          `).join("") || "<p>Nenhum</p>"}

          <p class="timestamp">
            Verificação realizada em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          
          <p style="font-size:13px;color:#6b7280;">
            Este alerta foi enviado automaticamente pelo sistema de monitoramento ${systemName}.<br>
            Para configurar alertas, acesse o painel de administração.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html: htmlContent };
}

async function sendWhatsAppAlert(
  results: HealthCheckResult[],
  alertPhone: string,
  whatsappToken: string,
  whatsappPhoneId: string
): Promise<boolean> {
  const downEndpoints = results.filter((r) => r.status === "down");
  const degradedEndpoints = results.filter((r) => r.status === "degraded");

  if (downEndpoints.length === 0 && degradedEndpoints.length === 0) {
    return true;
  }

  let message = "";
  if (downEndpoints.length > 0) {
    message = `🚨 *ALERTA CRÍTICO*\n\n${downEndpoints.length} serviço(s) OFFLINE:\n\n`;
    message += downEndpoints.map((r) => `❌ ${r.endpoint}\n   ${r.error || `Status: ${r.statusCode}`}`).join("\n\n");
  } else {
    message = `⚠️ *AVISO*\n\n${degradedEndpoints.length} serviço(s) com lentidão:\n\n`;
    message += degradedEndpoints.map((r) => `⚠️ ${r.endpoint}\n   Tempo: ${r.responseTime}ms`).join("\n\n");
  }

  message += `\n\n⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

  try {
    const phones = alertPhone.split(",").map((p) => p.trim());

    for (const phone of phones) {
      const formattedPhone = phone.replace(/\D/g, "");
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error(`Erro ao enviar WhatsApp para ${phone}:`, error);
        return false;
      }
    }

    console.log("WhatsApp de alerta enviado com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return false;
  }
}

async function saveHealthCheckResults(
  supabase: any,
  results: HealthCheckResult[]
): Promise<void> {
  try {
    const records = results.map((r) => ({
      endpoint_name: r.endpoint,
      status: r.status,
      response_time_ms: r.responseTime,
      status_code: r.statusCode,
      error_message: r.error || null,
      checked_at: r.timestamp,
    }));

    const { error } = await supabase
      .from("uptime_checks")
      .insert(records);

    if (error) {
      console.error("Erro ao salvar resultados:", error);
    }
  } catch (error) {
    console.error("Erro ao salvar resultados:", error);
  }
}

async function shouldSendAlert(
  supabase: any,
  endpoint: string,
  cooldownMinutes: number
): Promise<boolean> {
  try {
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("uptime_alerts")
      .select("id")
      .eq("endpoint_name", endpoint)
      .gte("sent_at", cooldownTime)
      .limit(1);

    if (error) {
      console.error("Erro ao verificar cooldown:", error);
      return true;
    }

    return !data || data.length === 0;
  } catch (error) {
    console.error("Erro ao verificar cooldown:", error);
    return true;
  }
}

async function recordAlertSent(
  supabase: any,
  endpoint: string,
  method: "email" | "whatsapp",
  status: string
): Promise<void> {
  try {
    await supabase.from("uptime_alerts").insert({
      endpoint_name: endpoint,
      alert_method: method,
      status_detected: status,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao registrar alerta:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", function: "uptime-monitor", version: "2.0.0" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get SMTP config from system_config table
    const { data: smtpConfigData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "smtp_config")
      .maybeSingle();

    const smtpConfig: SmtpConfig | null = smtpConfigData?.value;

    // Get system name for branding
    const { data: systemBranding } = await supabase
      .from("system_branding")
      .select("system_name")
      .single();
    
    const systemName = systemBranding?.system_name || smtpConfig?.from_name || "BarberSmart";

    // Obter configurações
    const mainDomain = Deno.env.get("MAIN_DOMAIN") || "barbersmart.app";
    const alertEmail = Deno.env.get("ALERT_EMAIL");
    const alertWhatsApp = Deno.env.get("ALERT_WHATSAPP");
    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    // Verificar se há configuração de alertas
    const hasEmailConfig = smtpConfig?.enabled && alertEmail;
    const hasWhatsAppConfig = alertWhatsApp && whatsappToken && whatsappPhoneId;

    if (!hasEmailConfig && !hasWhatsAppConfig) {
      console.warn("Nenhum método de alerta configurado. Configure SMTP + ALERT_EMAIL ou WhatsApp.");
    }

    // Obter configuração (pode ser customizada via body ou banco)
    const config = getDefaultConfig(mainDomain);

    // Adicionar endpoints customizados do body (se houver)
    try {
      const body = await req.json();
      if (body.endpoints && Array.isArray(body.endpoints)) {
        config.endpoints.push(...body.endpoints);
      }
    } catch {
      // Sem body JSON, usar apenas configuração padrão
    }

    console.log(`Iniciando verificação de ${config.endpoints.length} endpoints...`);

    // Executar health checks em paralelo
    const results = await Promise.all(config.endpoints.map(checkEndpoint));

    // Salvar resultados no banco
    await saveHealthCheckResults(supabase, results);

    // Verificar se precisa enviar alertas
    const problemEndpoints = results.filter(
      (r) => r.status === "down" || r.status === "degraded"
    );

    let emailSent = false;
    let whatsappSent = false;

    if (problemEndpoints.length > 0) {
      // Verificar cooldown para cada endpoint problemático
      for (const endpoint of problemEndpoints) {
        const canAlert = await shouldSendAlert(
          supabase,
          endpoint.endpoint,
          config.cooldownMinutes
        );

        if (canAlert) {
          // Enviar alerta por email via SMTP
          if (hasEmailConfig && smtpConfig) {
            const emails = alertEmail!.split(",").map((e) => e.trim());
            const { subject, html } = generateAlertEmailHtml(results, systemName);
            emailSent = await sendViaSmtp(smtpConfig, emails, subject, html);
            if (emailSent) {
              await recordAlertSent(supabase, endpoint.endpoint, "email", endpoint.status);
            }
          }

          // Enviar alerta por WhatsApp
          if (hasWhatsAppConfig) {
            whatsappSent = await sendWhatsAppAlert(
              results,
              alertWhatsApp!,
              whatsappToken!,
              whatsappPhoneId!
            );
            if (whatsappSent) {
              await recordAlertSent(supabase, endpoint.endpoint, "whatsapp", endpoint.status);
            }
          }

          // Só envia um alerta por execução (para não duplicar)
          break;
        }
      }
    }

    // Preparar resposta
    const summary = {
      timestamp: new Date().toISOString(),
      totalEndpoints: results.length,
      healthy: results.filter((r) => r.status === "healthy").length,
      degraded: results.filter((r) => r.status === "degraded").length,
      down: results.filter((r) => r.status === "down").length,
      alertsSent: {
        email: emailSent,
        whatsapp: whatsappSent,
      },
      results,
    };

    console.log("Verificação concluída:", {
      total: summary.totalEndpoints,
      healthy: summary.healthy,
      degraded: summary.degraded,
      down: summary.down,
    });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro no uptime monitor:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
