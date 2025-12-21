import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Cancel Pending] Starting check for pending reschedule confirmations...');

    // Find pending reschedule confirmations older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Get pending confirmation logs
    const { data: pendingLogs, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('message_type', 'reschedule_pending_confirmation')
      .eq('status', 'sent')
      .lt('created_at', twoHoursAgo);

    if (logsError) {
      console.error('[Cancel Pending] Error fetching pending logs:', logsError);
      throw logsError;
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      console.log('[Cancel Pending] No pending confirmations found older than 2 hours');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending confirmations to cancel', cancelled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cancel Pending] Found ${pendingLogs.length} pending confirmations to check`);

    let cancelledCount = 0;
    let notifiedCount = 0;

    for (const log of pendingLogs) {
      const appointmentId = log.metadata?.new_appointment_id;
      
      if (!appointmentId) {
        console.log('[Cancel Pending] Log missing appointment ID, skipping:', log.id);
        continue;
      }

      // Check if appointment still exists and is pending
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (id, name, phone, preferred_name, notification_types),
          services (name)
        `)
        .eq('id', appointmentId)
        .eq('status', 'agendado')
        .maybeSingle();

      if (aptError) {
        console.error('[Cancel Pending] Error fetching appointment:', aptError);
        continue;
      }

      if (!appointment) {
        // Appointment already confirmed/cancelled/completed, mark log as processed
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'processed' })
          .eq('id', log.id);
        console.log(`[Cancel Pending] Appointment ${appointmentId} already processed`);
        continue;
      }

      // Check if there's already a confirmation for this appointment
      const { data: confirmationLog } = await supabase
        .from('whatsapp_logs')
        .select('id')
        .eq('message_type', 'reschedule_client_confirmed')
        .eq('metadata->>appointment_id', appointmentId)
        .maybeSingle();

      if (confirmationLog) {
        // Already confirmed, mark pending log as processed
        await supabase
          .from('whatsapp_logs')
          .update({ status: 'processed' })
          .eq('id', log.id);
        console.log(`[Cancel Pending] Appointment ${appointmentId} was already confirmed`);
        continue;
      }

      // Cancel the appointment due to timeout
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelado',
          notes: `${appointment.notes || ''}\nCancelado automaticamente: sem confirmação em 2 horas`.trim()
        })
        .eq('id', appointmentId);

      if (cancelError) {
        console.error('[Cancel Pending] Error cancelling appointment:', cancelError);
        continue;
      }

      cancelledCount++;
      console.log(`[Cancel Pending] Cancelled appointment ${appointmentId}`);

      // Mark log as processed
      await supabase
        .from('whatsapp_logs')
        .update({ status: 'timeout_cancelled' })
        .eq('id', log.id);

      // Send cancellation notification if client allows
      const clientNotifications = appointment.clients?.notification_types || {};
      const shouldNotify = clientNotifications.no_show_reschedule !== false;

      if (shouldNotify && appointment.clients?.phone) {
        // Get WhatsApp config for this barbershop
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('barbershop_id', log.barbershop_id)
          .eq('is_active', true)
          .maybeSingle();

        if (whatsappConfig) {
          const { data: barbershop } = await supabase
            .from('barbershops')
            .select('name')
            .eq('id', log.barbershop_id)
            .single();

          const clientName = appointment.clients?.preferred_name || 
                            appointment.clients?.name?.split(' ')[0] || 
                            'Cliente';

          const message = `Olá ${clientName}! 👋

O horário que reservamos para você foi liberado pois não recebemos sua confirmação a tempo.

Se ainda deseja agendar, é só nos chamar! Teremos prazer em encontrar um novo horário para você. 💈

_${barbershop?.name || 'Barbearia'}_`;

          // Send via Evolution API
          if (whatsappConfig.provider === 'evolution' && whatsappConfig.evolution_instance) {
            try {
              const apiUrl = whatsappConfig.evolution_api_url || 'https://api.evolution.api.com';
              const apiKey = whatsappConfig.evolution_api_key;
              
              let phoneNumber = appointment.clients.phone.replace(/\D/g, '');
              if (!phoneNumber.startsWith('55')) {
                phoneNumber = '55' + phoneNumber;
              }

              const response = await fetch(
                `${apiUrl}/message/sendText/${whatsappConfig.evolution_instance}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey || '',
                  },
                  body: JSON.stringify({
                    number: phoneNumber,
                    text: message,
                  }),
                }
              );

              if (response.ok) {
                notifiedCount++;
                console.log(`[Cancel Pending] Sent timeout notification to ${phoneNumber}`);
              }
            } catch (sendError) {
              console.error('[Cancel Pending] Error sending notification:', sendError);
            }
          }

          // Log the cancellation notification
          await supabase.from('whatsapp_logs').insert({
            barbershop_id: log.barbershop_id,
            phone: appointment.clients.phone,
            message_type: 'reschedule_timeout_cancelled',
            message_content: message,
            status: 'sent',
            metadata: {
              appointment_id: appointmentId,
              cancelled_at: new Date().toISOString(),
              reason: 'timeout_no_confirmation',
            },
          });
        }
      }
    }

    console.log(`[Cancel Pending] Completed. Cancelled: ${cancelledCount}, Notified: ${notifiedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cancelled: cancelledCount,
        notified: notifiedCount,
        message: `Cancelled ${cancelledCount} pending appointments`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Cancel Pending] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
