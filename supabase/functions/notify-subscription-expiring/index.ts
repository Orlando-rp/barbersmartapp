import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringSubscription {
  id: string;
  barbershop_id: string;
  current_period_end: string;
  barbershop_name: string;
  owner_email: string;
  plan_name: string;
}

async function sendExpirationEmail(
  subscription: ExpiringSubscription,
  daysUntilExpiration: number,
  resendApiKey: string
): Promise<boolean> {
  const expirationDate = new Date(subscription.current_period_end).toLocaleDateString("pt-BR");
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 15px 0; }
        .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
        .plan-info { background: white; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">⏰ Sua assinatura expira em breve</h1>
          <p style="margin:10px 0 0;">BarberSmart</p>
        </div>
        <div class="content">
          <p>Olá!</p>
          
          <div class="warning-box">
            <h2 style="margin:0;color:#92400e;">⚠️ Atenção</h2>
            <p style="margin:10px 0 0;">
              A assinatura da barbearia <strong>${subscription.barbershop_name}</strong> expira em 
              <strong>${daysUntilExpiration} dia${daysUntilExpiration > 1 ? 's' : ''}</strong>!
            </p>
          </div>
          
          <div class="plan-info">
            <p style="margin:0;"><strong>Plano atual:</strong> ${subscription.plan_name}</p>
            <p style="margin:5px 0 0;"><strong>Data de expiração:</strong> ${expirationDate}</p>
          </div>
          
          <p>
            Para continuar aproveitando todos os recursos do BarberSmart e evitar interrupções no seu serviço, 
            renove sua assinatura antes da data de expiração.
          </p>
          
          <p>
            <strong>O que acontece se não renovar?</strong>
          </p>
          <ul>
            <li>Seus clientes não poderão fazer agendamentos online</li>
            <li>Você perderá acesso às funcionalidades premium</li>
            <li>Os dados serão mantidos por 30 dias após a expiração</li>
          </ul>
          
          <a href="#" class="cta-button">Renovar Agora</a>
          
          <p style="color:#6b7280;font-size:13px;margin-top:30px;">
            Se você já renovou ou tem renovação automática ativa, pode ignorar este email.
          </p>
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          
          <p style="font-size:13px;color:#6b7280;">
            Este email foi enviado automaticamente pelo BarberSmart.<br>
            Caso tenha dúvidas, entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BarberSmart <noreply@resend.dev>",
        to: [subscription.owner_email],
        subject: `⏰ Sua assinatura expira em ${daysUntilExpiration} dia${daysUntilExpiration > 1 ? 's' : ''} - BarberSmart`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send email to ${subscription.owner_email}:`, errorText);
      return false;
    }

    console.log(`Email sent successfully to ${subscription.owner_email}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${subscription.owner_email}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "RESEND_API_KEY not configured" 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 7 days from now
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    // Format dates for comparison
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking subscriptions expiring between ${todayStr} and ${sevenDaysStr}`);

    // Find subscriptions expiring in the next 7 days
    const { data: expiringSubscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        barbershop_id,
        current_period_end,
        status,
        plan:subscription_plans(name)
      `)
      .eq("status", "active")
      .gte("current_period_end", todayStr)
      .lte("current_period_end", sevenDaysStr);

    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError);
      throw subscriptionsError;
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      console.log("No subscriptions expiring in the next 7 days");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No expiring subscriptions found",
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log(`Found ${expiringSubscriptions.length} expiring subscriptions`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const subscription of expiringSubscriptions) {
      // Get barbershop and owner details
      const { data: barbershop, error: barbershopError } = await supabase
        .from("barbershops")
        .select("name, owner_id")
        .eq("id", subscription.barbershop_id)
        .single();

      if (barbershopError || !barbershop) {
        console.error(`Error fetching barbershop ${subscription.barbershop_id}:`, barbershopError);
        continue;
      }

      // Get owner email
      const { data: owner, error: ownerError } = await supabase
        .from("users")
        .select("email")
        .eq("id", barbershop.owner_id)
        .single();

      if (ownerError || !owner?.email) {
        console.error(`Error fetching owner for barbershop ${subscription.barbershop_id}:`, ownerError);
        continue;
      }

      // Calculate days until expiration
      const expirationDate = new Date(subscription.current_period_end);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const subscriptionData: ExpiringSubscription = {
        id: subscription.id,
        barbershop_id: subscription.barbershop_id,
        current_period_end: subscription.current_period_end,
        barbershop_name: barbershop.name,
        owner_email: owner.email,
        plan_name: subscription.plan?.name || "Plano Atual",
      };

      const sent = await sendExpirationEmail(subscriptionData, daysUntilExpiration, resendApiKey);
      
      if (sent) {
        emailsSent++;
        
        // Log the notification
        await supabase.from("audit_logs").insert({
          action: "subscription_expiration_notification",
          entity_type: "subscription",
          entity_id: subscription.id,
          details: {
            barbershop_id: subscription.barbershop_id,
            days_until_expiration: daysUntilExpiration,
            email_sent_to: owner.email,
          },
        });
      } else {
        emailsFailed++;
      }
    }

    console.log(`Notification complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiringSubscriptions.length} subscriptions`,
        emailsSent,
        emailsFailed,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error) {
    console.error("Error in notify-subscription-expiring:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
