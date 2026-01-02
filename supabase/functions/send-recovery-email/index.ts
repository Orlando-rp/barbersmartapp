// Edge Function: send-recovery-email
// Version: 2.0.0 - Now uses custom SMTP from admin panel
// Last updated: 2026-01-02

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryRequest {
  email: string;
  redirectUrl: string;
}

interface TenantBranding {
  system_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

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

// Generate recovery email HTML with tenant branding
function generateEmailHtml(branding: TenantBranding, resetLink: string): string {
  const logoHtml = branding.logo_url 
    ? `<img src="${branding.logo_url}" alt="${branding.system_name}" style="max-height: 60px; max-width: 200px;" />`
    : `<h2 style="color: #ffffff; margin: 0; font-size: 24px;">${branding.system_name}</h2>`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - ${branding.system_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${branding.secondary_color}; padding: 30px 40px; text-align: center; border-radius: 12px 12px 0 0;">
              ${logoHtml}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <h1 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                🔐 Redefinir sua senha
              </h1>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${branding.system_name}</strong>.
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetLink}" 
                       style="display: inline-block; 
                              background-color: ${branding.primary_color}; 
                              color: #ffffff; 
                              font-size: 16px; 
                              font-weight: 600; 
                              text-decoration: none; 
                              padding: 14px 32px; 
                              border-radius: 8px;
                              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                Este link expira em <strong>1 hora</strong>.<br>
                Se você não solicitou esta alteração, ignore este email.
              </p>
              
              <!-- Link fallback -->
              <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 20px 0 0 0; word-break: break-all;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${resetLink}" style="color: ${branding.primary_color};">${resetLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                <strong>${branding.system_name}</strong>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este email foi enviado automaticamente. Não responda a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(48);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 48; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

// Send email via custom SMTP
async function sendViaSmtp(smtpConfig: SmtpConfig, to: string, subject: string, html: string): Promise<void> {
  console.log(`[SMTP] Connecting to ${smtpConfig.host}:${smtpConfig.port} (secure: ${smtpConfig.secure})`);
  
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
    await client.send({
      from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });
    console.log('[SMTP] Email sent successfully');
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  console.log("send-recovery-email: Request received", { method: req.method });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", function: "send-recovery-email", version: "2.0.0" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email, redirectUrl }: RecoveryRequest = await req.json();
    console.log("send-recovery-email: Parsed request", { email, redirectUrl });

    if (!email || !redirectUrl) {
      console.error("send-recovery-email: Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Email e URL de redirecionamento são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email in auth.users first (needed to get barbershop association)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error listing users:", authError);
      throw new Error("Erro ao buscar usuário");
    }

    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists - send success anyway for security
      console.log("User not found, returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá as instruções" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's profile and associated barbershop for SMTP hierarchy
    let barbershopSmtpConfig: SmtpConfig | null = null;
    let userBarbershopId: string | null = null;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profile) {
      const { data: userBarbershop } = await supabase
        .from("user_barbershops")
        .select("barbershop_id")
        .eq("user_id", profile.id)
        .limit(1)
        .single();

      if (userBarbershop) {
        userBarbershopId = userBarbershop.barbershop_id;
        
        // Get barbershop's email_config
        const { data: barbershop } = await supabase
          .from("barbershops")
          .select("id, name, parent_id, email_config, custom_branding, subscription_id")
          .eq("id", userBarbershop.barbershop_id)
          .single();

        if (barbershop) {
          // If it's a unit, get parent's config
          const targetBarbershopId = barbershop.parent_id || barbershop.id;
          
          let targetBarbershop = barbershop;
          if (barbershop.parent_id) {
            const { data: parent } = await supabase
              .from("barbershops")
              .select("id, name, email_config, custom_branding, subscription_id")
              .eq("id", barbershop.parent_id)
              .single();
            if (parent) targetBarbershop = parent;
          }

          // Check if has white_label feature (required for custom SMTP)
          let hasWhiteLabel = false;
          if (targetBarbershop.subscription_id) {
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("plan_id")
              .eq("id", targetBarbershop.subscription_id)
              .single();

            if (subscription) {
              const { data: plan } = await supabase
                .from("subscription_plans")
                .select("feature_flags")
                .eq("id", subscription.plan_id)
                .single();

              if (plan?.feature_flags?.white_label) {
                hasWhiteLabel = true;
              }
            }
          }

          // Use barbershop SMTP if white_label and enabled
          if (hasWhiteLabel && targetBarbershop.email_config?.enabled) {
            barbershopSmtpConfig = targetBarbershop.email_config;
            console.log("[SMTP] Using barbershop-specific SMTP config");
          }
        }
      }
    }

    // Determine which SMTP to use (barbershop or global fallback)
    let smtpConfig: SmtpConfig | null = barbershopSmtpConfig;
    
    if (!smtpConfig) {
      // Fallback to global SMTP config
      const { data: smtpConfigData } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "smtp_config")
        .maybeSingle();

      smtpConfig = smtpConfigData?.value;
      if (smtpConfig?.enabled) {
        console.log("[SMTP] Using global SMTP config");
      }
    }
    
    if (!smtpConfig || !smtpConfig.enabled) {
      console.error("SMTP not configured or disabled");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Servidor de email não configurado. Configure nas integrações do painel administrativo." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass || !smtpConfig.from_email) {
      console.error("SMTP config incomplete");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração SMTP incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default branding (use from_name as system name)
    let branding: TenantBranding = {
      system_name: smtpConfig.from_name || "BarberSmart",
      logo_url: null,
      primary_color: "#d4a574",
      secondary_color: "#1a1a2e"
    };

    // Try to get system branding first
    const { data: systemBranding } = await supabase
      .from("system_branding")
      .select("system_name, logo_url, primary_color, secondary_color")
      .single();

    if (systemBranding) {
      branding = {
        system_name: systemBranding.system_name || branding.system_name,
        logo_url: systemBranding.logo_url,
        primary_color: systemBranding.primary_color || branding.primary_color,
        secondary_color: systemBranding.secondary_color || branding.secondary_color
      };
    }

    // Try to get tenant-specific branding if user has barbershop association with white_label
    if (userBarbershopId) {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id, name, parent_id, custom_branding, subscription_id")
        .eq("id", userBarbershopId)
        .single();

      if (barbershop) {
        // If it's a unit, get parent's branding
        const targetBarbershopId = barbershop.parent_id || barbershop.id;
        
        let targetBarbershop = barbershop;
        if (barbershop.parent_id) {
          const { data: parent } = await supabase
            .from("barbershops")
            .select("id, name, custom_branding, subscription_id")
            .eq("id", barbershop.parent_id)
            .single();
          if (parent) targetBarbershop = parent;
        }

        // Check if has white_label feature
        let hasWhiteLabel = false;
        if (targetBarbershop.subscription_id) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("plan_id")
            .eq("id", targetBarbershop.subscription_id)
            .single();

          if (subscription) {
            const { data: plan } = await supabase
              .from("subscription_plans")
              .select("feature_flags")
              .eq("id", subscription.plan_id)
              .single();

            if (plan?.feature_flags?.white_label) {
              hasWhiteLabel = true;
            }
          }
        }

        // Apply tenant branding if has white_label and custom_branding
        if (hasWhiteLabel && targetBarbershop.custom_branding) {
          const customBranding = targetBarbershop.custom_branding;
          branding = {
            system_name: customBranding.system_name || targetBarbershop.name || branding.system_name,
            logo_url: customBranding.logo_url || branding.logo_url,
            primary_color: customBranding.primary_color || branding.primary_color,
            secondary_color: customBranding.secondary_color || branding.secondary_color
          };
        }
      }
    }

    // Generate recovery token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in auth_otp_codes table (reusing existing table)
    const { error: insertError } = await supabase
      .from("auth_otp_codes")
      .insert({
        phone: email.toLowerCase(), // Using phone field to store email
        code: token,
        expires_at: expiresAt.toISOString(),
        used: false,
        purpose: "email_recovery"
      });

    if (insertError) {
      console.error("Error storing recovery token:", insertError);
      throw new Error("Erro ao gerar token de recuperação");
    }

    // Build reset link
    const resetLink = `${redirectUrl}?recovery=email&token=${token}&email=${encodeURIComponent(email)}`;

    // Generate email HTML
    const emailHtml = generateEmailHtml(branding, resetLink);
    const subject = `🔐 Redefinir sua senha - ${branding.system_name}`;

    // Send via SMTP
    try {
      await sendViaSmtp(smtpConfig, email, subject, emailHtml);
      console.log("Recovery email sent successfully via SMTP");
    } catch (smtpError: any) {
      console.error("SMTP send error:", smtpError);
      
      // Parse error message for user
      let userError = "Erro ao enviar email";
      if (smtpError.message?.includes("authentication")) {
        userError = "Falha na autenticação SMTP. Verifique as credenciais.";
      } else if (smtpError.message?.includes("ECONNREFUSED")) {
        userError = "Não foi possível conectar ao servidor SMTP.";
      } else if (smtpError.message?.includes("timeout")) {
        userError = "Timeout ao conectar ao servidor SMTP.";
      }
      
      return new Response(
        JSON.stringify({ success: false, error: userError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-recovery-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
