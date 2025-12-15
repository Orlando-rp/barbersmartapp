import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewRequest {
  appointmentId: string;
  barbershopId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  staffName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { appointmentId, barbershopId, clientName, clientPhone, serviceName, staffName }: ReviewRequest = await req.json();

    console.log("Send review request:", { appointmentId, barbershopId, clientName, clientPhone });

    if (!barbershopId || !clientPhone || !clientName) {
      throw new Error("barbershopId, clientPhone, and clientName are required");
    }

    // Get barbershop info
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name, parent_id")
      .eq("id", barbershopId)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    const barbershopName = barbershop?.name || "Barbearia";

    // Check client notification preferences
    const phoneClean = clientPhone.replace(/\D/g, "");
    const { data: client } = await supabase
      .from("clients")
      .select("notification_enabled, notification_types, preferred_name")
      .eq("phone", clientPhone)
      .eq("barbershop_id", barbershop.parent_id || barbershopId)
      .maybeSingle();
    
    // Use preferred_name if available
    const displayName = client?.preferred_name || clientName;

    // Check if client has opted out of completed notifications
    if (client) {
      if (client.notification_enabled === false) {
        console.log("Client has disabled notifications");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Client disabled notifications" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const notificationTypes = client.notification_types || {};
      if (notificationTypes.appointment_completed === false) {
        console.log("Client has opted out of completed notifications");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Client opted out of completed notifications" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get WhatsApp configuration
    const { data: whatsappConfig } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .eq("is_active", true)
      .maybeSingle();

    // Build review request message
    let message = `⭐ Olá ${displayName}!\n\n`;
    message += `Esperamos que você tenha gostado do seu atendimento na ${barbershopName}`;
    
    if (serviceName) {
      message += ` - ${serviceName}`;
    }
    
    if (staffName) {
      message += ` com ${staffName}`;
    }
    
    message += `.\n\n`;
    message += `Sua opinião é muito importante para nós! Por favor, avalie nosso serviço:\n\n`;
    message += `📱 Responda com uma nota de 1 a 5 estrelas:\n`;
    message += `1 ⭐ - Muito ruim\n`;
    message += `2 ⭐⭐ - Ruim\n`;
    message += `3 ⭐⭐⭐ - Regular\n`;
    message += `4 ⭐⭐⭐⭐ - Bom\n`;
    message += `5 ⭐⭐⭐⭐⭐ - Excelente\n\n`;
    message += `Você também pode adicionar um comentário após a nota. Obrigado! 💈`;

    let messageSent = false;
    let whatsappMessageId = null;

    // Try Evolution API first
    if (whatsappConfig?.provider === "evolution" && whatsappConfig.evolution_instance_name) {
      try {
        // Get global Evolution API config
        const { data: globalConfig } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "evolution_api")
          .single();

        if (globalConfig?.value) {
          const evolutionConfig = globalConfig.value;
          const apiUrl = evolutionConfig.api_url;
          const apiKey = evolutionConfig.api_key;
          const instanceName = whatsappConfig.evolution_instance_name;

          console.log("Sending via Evolution API:", { apiUrl, instanceName });

          const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey,
            },
            body: JSON.stringify({
              number: phoneClean,
              text: message,
            }),
          });

          const responseData = await response.json();
          console.log("Evolution API response:", responseData);

          if (response.ok) {
            messageSent = true;
            whatsappMessageId = responseData.key?.id || responseData.messageId;
          } else {
            console.error("Evolution API error:", responseData);
          }
        }
      } catch (evolutionError) {
        console.error("Evolution API error:", evolutionError);
      }
    }

    // Try Meta API if Evolution didn't work
    if (!messageSent && whatsappConfig?.provider === "meta" && whatsappConfig.phone_number_id) {
      try {
        const payload = {
          messaging_product: "whatsapp",
          to: phoneClean,
          type: "text",
          text: { body: message },
        };

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappConfig.phone_number_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${whatsappConfig.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const responseData = await response.json();
        console.log("Meta API response:", responseData);

        if (response.ok) {
          messageSent = true;
          whatsappMessageId = responseData.messages?.[0]?.id;
        } else {
          console.error("Meta API error:", responseData);
        }
      } catch (metaError) {
        console.error("Meta API error:", metaError);
      }
    }

    // Log the message attempt
    await supabase.from("whatsapp_logs").insert({
      barbershop_id: barbershopId,
      appointment_id: appointmentId,
      recipient_phone: phoneClean,
      recipient_name: clientName,
      message_type: "review_request",
      message_content: message,
      status: messageSent ? "sent" : "failed",
      whatsapp_message_id: whatsappMessageId,
      provider: whatsappConfig?.provider || "none",
      error_message: messageSent ? null : "WhatsApp not configured or send failed",
    });

    // Update appointment to mark review request sent
    if (appointmentId) {
      await supabase
        .from("appointments")
        .update({ review_request_sent: new Date().toISOString() })
        .eq("id", appointmentId);
    }

    console.log("Review request result:", { messageSent, whatsappMessageId });

    return new Response(
      JSON.stringify({
        success: true,
        messageSent,
        whatsappConfigured: !!whatsappConfig,
        message: messageSent 
          ? `Solicitação de avaliação enviada para ${clientName}`
          : `Solicitação registrada (WhatsApp não configurado)`,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in send-review-request function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
