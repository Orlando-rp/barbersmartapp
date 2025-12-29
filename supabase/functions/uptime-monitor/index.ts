import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BarberSmart Uptime Monitor
 * 
 * Verifica endpoints de saúde e envia alertas via Email/WhatsApp quando detecta problemas.
 * 
 * Secrets necessários:
 * - RESEND_API_KEY: API key do Resend para envio de emails
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
  alertThreshold: number; // Número de falhas consecutivas antes de alertar
  cooldownMinutes: number; // Minutos entre alertas para o mesmo endpoint
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
        "User-Agent": "BarberSmart-UptimeMonitor/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Determinar status baseado no código e tempo de resposta
    let status: "healthy" | "degraded" | "down";
    if (response.status === endpoint.expectedStatus) {
      status = responseTime > 5000 ? "degraded" : "healthy";
    } else if (response.status >= 500) {
      status = "down";
    } else {
      status = "degraded";
    }

    return {
      endpoint: endpoint.name,
      status,
      responseTime,
      statusCode: response.status,
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

async function sendEmailAlert(
  results: HealthCheckResult[],
  alertEmail: string,
  resendApiKey: string
): Promise<boolean> {
  const downEndpoints = results.filter((r) => r.status === "down");
  const degradedEndpoints = results.filter((r) => r.status === "degraded");

  if (downEndpoints.length === 0 && degradedEndpoints.length === 0) {
    return true;
  }

  const subject = downEndpoints.length > 0
    ? `🚨 ALERTA: ${downEndpoints.length} serviço(s) OFFLINE - BarberSmart`
    : `⚠️ AVISO: ${degradedEndpoints.length} serviço(s) com lentidão - BarberSmart`;

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
          <p style="margin:10px 0 0;">BarberSmart Uptime Monitor</p>
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
            Este alerta foi enviado automaticamente pelo sistema de monitoramento BarberSmart.<br>
            Para configurar alertas, acesse o painel de administração.
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
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro ao enviar email:", error);
      return false;
    }

    console.log("Email de alerta enviado com sucesso para:", emails);
    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
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

  const emoji = downEndpoints.length > 0 ? "🚨" : "⚠️";
  const title = downEndpoints.length > 0
    ? `*${emoji} ALERTA: Sistema OFFLINE*`
    : `*${emoji} AVISO: Lentidão Detectada*`;

  let message = `${title}\n\n`;
  message += `📊 *BarberSmart Uptime Monitor*\n`;
  message += `⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n\n`;

  if (downEndpoints.length > 0) {
    message += `❌ *Serviços Offline:*\n`;
    downEndpoints.forEach((r) => {
      message += `• ${r.endpoint}: ${r.statusCode || "Timeout"} (${r.responseTime}ms)\n`;
      if (r.error) message += `  _Erro: ${r.error}_\n`;
    });
    message += "\n";
  }

  if (degradedEndpoints.length > 0) {
    message += `⚠️ *Serviços Lentos:*\n`;
    degradedEndpoints.forEach((r) => {
      message += `• ${r.endpoint}: ${r.statusCode} (${r.responseTime}ms)\n`;
    });
    message += "\n";
  }

  const healthyCount = results.filter((r) => r.status === "healthy").length;
  message += `✅ Serviços saudáveis: ${healthyCount}/${results.length}`;

  try {
    const phones = alertPhone.split(",").map((p) => p.trim().replace(/\D/g, ""));
    
    for (const phone of phones) {
      const response = await fetch(
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

      if (!response.ok) {
        const error = await response.json();
        console.error(`Erro ao enviar WhatsApp para ${phone}:`, error);
      } else {
        console.log(`WhatsApp de alerta enviado para: ${phone}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return false;
  }
}

async function saveHealthCheckResults(
  supabase: ReturnType<typeof createClient>,
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

    const { error } = await supabase.from("uptime_logs").insert(records);

    if (error) {
      console.error("Erro ao salvar logs de uptime:", error);
    }
  } catch (error) {
    console.error("Erro ao salvar resultados:", error);
  }
}

async function shouldSendAlert(
  supabase: ReturnType<typeof createClient>,
  endpointName: string,
  cooldownMinutes: number
): Promise<boolean> {
  try {
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from("uptime_alerts")
      .select("sent_at")
      .eq("endpoint_name", endpointName)
      .gte("sent_at", cooldownTime)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erro ao verificar cooldown:", error);
      return true; // Em caso de erro, permite enviar
    }

    return !data || data.length === 0;
  } catch (error) {
    console.error("Erro ao verificar cooldown:", error);
    return true;
  }
}

async function recordAlertSent(
  supabase: ReturnType<typeof createClient>,
  endpointName: string,
  alertType: "email" | "whatsapp",
  status: string
): Promise<void> {
  try {
    await supabase.from("uptime_alerts").insert({
      endpoint_name: endpointName,
      alert_type: alertType,
      status,
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter configurações
    const mainDomain = Deno.env.get("MAIN_DOMAIN") || "barbersmart.app";
    const alertEmail = Deno.env.get("ALERT_EMAIL");
    const alertWhatsApp = Deno.env.get("ALERT_WHATSAPP");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    // Verificar se há configuração de alertas
    const hasEmailConfig = alertEmail && resendApiKey;
    const hasWhatsAppConfig = alertWhatsApp && whatsappToken && whatsappPhoneId;

    if (!hasEmailConfig && !hasWhatsAppConfig) {
      console.warn("Nenhum método de alerta configurado. Configure ALERT_EMAIL + RESEND_API_KEY ou ALERT_WHATSAPP + credenciais WhatsApp.");
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
          // Enviar alerta por email
          if (hasEmailConfig) {
            emailSent = await sendEmailAlert(results, alertEmail!, resendApiKey!);
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
