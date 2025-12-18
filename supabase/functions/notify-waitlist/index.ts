// Notify Waitlist Edge Function - v1.0.1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  barbershopId: string;
  availableDate: string;
  availableTime?: string;
  staffId?: string;
  serviceId?: string;
  waitlistEntryId?: string; // If provided, notify only this specific entry
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { barbershopId, availableDate, availableTime, staffId, serviceId, waitlistEntryId }: NotifyRequest = await req.json();

    console.log("Notify waitlist request:", { barbershopId, availableDate, availableTime, staffId, waitlistEntryId });

    if (!barbershopId) {
      throw new Error("barbershopId is required");
    }

    // Get barbershop info for the message
    const { data: barbershop } = await supabase
      .from("barbershops")
      .select("name")
      .eq("id", barbershopId)
      .single();

    const barbershopName = barbershop?.name || "Barbearia";

    // Build query to find matching waitlist entries
    let query = supabase
      .from("waitlist")
      .select(`
        *,
        service:services(name),
        staff:staff(profiles:profiles!staff_user_id_fkey(full_name))
      `)
      .eq("barbershop_id", barbershopId)
      .in("status", ["waiting", "notified"]);

    // If specific entry, notify only that one
    if (waitlistEntryId) {
      query = query.eq("id", waitlistEntryId);
    } else {
      // Otherwise find entries matching the available slot
      if (availableDate) {
        query = query.eq("preferred_date", availableDate);
      }
      if (staffId) {
        query = query.or(`staff_id.eq.${staffId},staff_id.is.null`);
      }
      if (serviceId) {
        query = query.or(`service_id.eq.${serviceId},service_id.is.null`);
      }
    }

    const { data: entries, error: entriesError } = await query;

    if (entriesError) {
      console.error("Error fetching waitlist entries:", entriesError);
      throw entriesError;
    }

    if (!entries || entries.length === 0) {
      console.log("No waitlist entries found to notify");
      return new Response(
        JSON.stringify({ 
          success: true, 
          notified: 0, 
          message: "Nenhuma entrada na lista de espera para notificar" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${entries.length} waitlist entries to notify`);

    // Check if WhatsApp is configured
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    
    const whatsappConfigured = WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID;

    const results = {
      notified: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const entry of entries) {
      // Buscar nome preferido do cliente se disponível (fora do try para usar no catch)
      let clientDisplayName = entry.client_name;
      try {
        if (entry.client_phone) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("preferred_name, name")
            .eq("phone", entry.client_phone.replace(/\D/g, ""))
            .eq("barbershop_id", barbershopId)
            .maybeSingle();
          
          if (clientData) {
            clientDisplayName = clientData.preferred_name || clientData.name || entry.client_name;
          }
        }

        // Format date for message
        const dateObj = new Date(entry.preferred_date + "T12:00:00");
        const formattedDate = dateObj.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

        // Build notification message using preferred name
        let message = `🎉 Boa notícia, ${clientDisplayName}!\n\n`;
        message += `Surgiu uma vaga na ${barbershopName} para ${formattedDate}`;
        
        if (availableTime) {
          message += ` às ${availableTime}`;
        }
        
        if (entry.service?.name) {
          message += ` para o serviço "${entry.service.name}"`;
        }
        
        if (entry.staff?.profiles?.full_name) {
          message += ` com ${entry.staff.profiles.full_name}`;
        }
        
        message += `.\n\nEntre em contato conosco para confirmar seu agendamento!`;

        console.log(`Notifying ${clientDisplayName} (${entry.client_phone})`);

        if (whatsappConfigured) {
          // Send WhatsApp message
          const phoneNumber = entry.client_phone.replace(/\D/g, "");
          
          const payload = {
            messaging_product: "whatsapp",
            to: phoneNumber,
            type: "text",
            text: { body: message },
          };

          const response = await fetch(
            `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          const responseData = await response.json();

          if (!response.ok) {
            console.error("WhatsApp API error for", clientDisplayName, responseData);
            throw new Error(responseData.error?.message || "Failed to send WhatsApp");
          }

          // Log the message with preferred name
          await supabase.from("whatsapp_logs").insert({
            barbershop_id: barbershopId,
            recipient_phone: phoneNumber,
            recipient_name: clientDisplayName,
            message_type: "text",
            message_content: message,
            status: "sent",
            whatsapp_message_id: responseData.messages?.[0]?.id,
          });
        } else {
          console.log("WhatsApp not configured, skipping actual send");
        }

        // Update waitlist entry status to notified
        await supabase
          .from("waitlist")
          .update({ 
            status: "notified", 
            notified_at: new Date().toISOString() 
          })
          .eq("id", entry.id);

        results.notified++;
      } catch (entryError) {
        console.error("Error notifying entry:", entry.id, entryError);
        results.failed++;
        results.errors.push(`${clientDisplayName}: ${entryError instanceof Error ? entryError.message : "Unknown error"}`);
        
        // Log failed attempt with preferred name
        if (whatsappConfigured) {
          await supabase.from("whatsapp_logs").insert({
            barbershop_id: barbershopId,
            recipient_phone: entry.client_phone.replace(/\D/g, ""),
            recipient_name: clientDisplayName,
            message_type: "text",
            message_content: "Notificação de vaga disponível",
            status: "failed",
            error_message: entryError instanceof Error ? entryError.message : "Unknown error",
          }).catch(console.error);
        }
      }
    }

    console.log("Notification results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        message: `${results.notified} cliente(s) notificado(s)${results.failed > 0 ? `, ${results.failed} falha(s)` : ""}`,
        whatsappConfigured,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in notify-waitlist function:", error);
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
