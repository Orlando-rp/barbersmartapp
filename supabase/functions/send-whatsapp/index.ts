import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { to, message, type = "text", barbershopId, recipientName, appointmentId, campaignId, createdBy } = body;

    console.log("WhatsApp request received:", { to, type, barbershopId });

    // Validate phone number
    if (!to) {
      console.error("Phone number (to) is required");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Número de telefone é obrigatório" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error("WhatsApp credentials not configured");
      
      // Log the failure
      if (barbershopId) {
        await supabase.from("whatsapp_logs").insert({
          barbershop_id: barbershopId,
          recipient_phone: to?.replace(/\D/g, "") || "unknown",
          recipient_name: recipientName || null,
          message_type: type,
          message_content: message || "",
          status: "failed",
          error_message: "WhatsApp credentials not configured. Please add WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets.",
          created_by: createdBy || null,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp não configurado. Adicione WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID nos secrets." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove non-numeric characters from phone number
    const phoneNumber = to.replace(/\D/g, "");

    // Prepare message payload
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: type,
    };

    if (type === "text") {
      payload.text = { body: message };
    } else if (type === "template") {
      payload.template = message;
    }

    console.log("Sending to WhatsApp API:", { to: phoneNumber, type });

    // Send message via WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      
      // Log the failure
      if (barbershopId) {
        await supabase.from("whatsapp_logs").insert({
          barbershop_id: barbershopId,
          recipient_phone: phoneNumber,
          recipient_name: recipientName || null,
          message_type: type,
          message_content: message,
          status: "failed",
          error_message: responseData.error?.message || "WhatsApp API error",
          appointment_id: appointmentId || null,
          campaign_id: campaignId || null,
          created_by: createdBy || null,
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: responseData.error?.message || "Erro na API do WhatsApp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp message sent successfully:", responseData);

    // Save success log to database
    if (barbershopId) {
      const { error: logError } = await supabase.from("whatsapp_logs").insert({
        barbershop_id: barbershopId,
        recipient_phone: phoneNumber,
        recipient_name: recipientName || null,
        message_type: type,
        message_content: message,
        status: "sent",
        whatsapp_message_id: responseData.messages?.[0]?.id || null,
        appointment_id: appointmentId || null,
        campaign_id: campaignId || null,
        created_by: createdBy || null,
      });

      if (logError) {
        console.error("Failed to save log:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messages?.[0]?.id,
        data: responseData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
