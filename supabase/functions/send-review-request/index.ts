/**
 * Send Review Request via WhatsApp
 * 
 * Usa whatsapp-resolver para resolver configuração por barbearia
 * com fallback automático para global se necessário.
 * 
 * @version 2025-01-02.review-v2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveWhatsAppConfig,
  sendWhatsAppMessage,
  RESOLVER_VERSION
} from "../_shared/whatsapp-resolver.ts";

const FUNCTION_VERSION = '2025-01-02.review-v2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Function-Version": FUNCTION_VERSION
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

    console.log(`[review-request] Version: ${FUNCTION_VERSION}`, { appointmentId, barbershopId, clientName });

    if (!barbershopId || !clientPhone || !clientName) {
      return new Response(JSON.stringify({
        success: false,
        error: "barbershopId, clientPhone e clientName são obrigatórios",
        functionVersion: FUNCTION_VERSION
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Buscar info da barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name, parent_id")
      .eq("id", barbershopId)
      .single();

    if (barbershopError) {
      console.error("Erro ao buscar barbearia:", barbershopError);
      throw barbershopError;
    }

    const barbershopName = barbershop?.name || "Barbearia";

    // Verificar preferências do cliente
    const phoneClean = clientPhone.replace(/\D/g, "");
    const { data: client } = await supabase
      .from("clients")
      .select("notification_enabled, notification_types, preferred_name")
      .eq("phone", clientPhone)
      .eq("barbershop_id", barbershop.parent_id || barbershopId)
      .maybeSingle();
    
    const displayName = client?.preferred_name || clientName;

    // Verificar opt-out
    if (client) {
      if (client.notification_enabled === false) {
        console.log("Cliente desabilitou notificações");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Cliente desabilitou notificações" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const notificationTypes = client.notification_types || {};
      if (notificationTypes.appointment_completed === false) {
        console.log("Cliente optou por não receber avaliações");
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "Cliente optou por não receber avaliações" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Resolver configuração WhatsApp
    const whatsappConfig = await resolveWhatsAppConfig(supabase, barbershopId, {
      requireConnected: true
    });

    // Construir mensagem
    let message = `⭐ Olá ${displayName}!\n\n`;
    message += `Esperamos que você tenha gostado do seu atendimento na ${barbershopName}`;
    
    if (serviceName) message += ` - ${serviceName}`;
    if (staffName) message += ` com ${staffName}`;
    
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
    let messageId = null;

    if (whatsappConfig) {
      console.log(`[review-request] Using instance: ${whatsappConfig.instanceName} (source: ${whatsappConfig.source})`);
      
      const result = await sendWhatsAppMessage(whatsappConfig, phoneClean, message, {
        supabase,
        barbershopId,
        messageType: 'review_request',
        recipientName: clientName,
        appointmentId
      });

      messageSent = result.success;
      messageId = result.messageId;
      
      if (!result.success) {
        console.error("[review-request] Falha ao enviar:", result.error);
      }
    } else {
      console.log("[review-request] WhatsApp não configurado");
      
      // Log mesmo sem enviar
      await supabase.from("whatsapp_logs").insert({
        barbershop_id: barbershopId,
        appointment_id: appointmentId,
        recipient_phone: phoneClean,
        recipient_name: clientName,
        message_type: "review_request",
        message_content: message,
        status: "failed",
        provider: "none",
        error_message: "WhatsApp não configurado"
      });
    }

    // Marcar agendamento como solicitação de avaliação enviada
    if (appointmentId) {
      await supabase
        .from("appointments")
        .update({ review_request_sent: new Date().toISOString() })
        .eq("id", appointmentId);
    }

    console.log("[review-request] Resultado:", { messageSent, messageId });

    return new Response(
      JSON.stringify({
        success: true,
        messageSent,
        whatsappConfigured: !!whatsappConfig,
        message: messageSent 
          ? `Solicitação de avaliação enviada para ${clientName}`
          : `Solicitação registrada (WhatsApp não configurado)`,
        functionVersion: FUNCTION_VERSION
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("[review-request] Erro:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        functionVersion: FUNCTION_VERSION
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
