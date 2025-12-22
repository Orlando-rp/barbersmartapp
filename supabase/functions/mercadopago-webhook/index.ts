import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    // Mercado Pago sends different notification types
    const { type, data, action } = body;

    // We're interested in payment notifications
    if (type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') {
      console.log('Ignoring non-payment notification:', type, action);
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.log('No payment ID in webhook');
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // We need to get the payment details from Mercado Pago to verify it
    // First, find the appointment by external_reference or payment_id
    // The external_reference should be the appointment ID

    // Get payment details from Mercado Pago
    // We need to find which barbershop this payment belongs to
    // For now, we'll try to get the external_reference from the webhook metadata

    let appointmentId = body.external_reference;
    
    if (!appointmentId) {
      // Try to find appointment by looking at all payment settings and checking each one
      console.log('No external_reference, attempting to fetch payment details from MP');
      
      // Get all payment settings
      const { data: allSettings } = await supabase
        .from('payment_settings')
        .select('mercadopago_access_token, barbershop_id')
        .not('mercadopago_access_token', 'is', null);

      if (allSettings) {
        for (const settings of allSettings) {
          try {
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: {
                'Authorization': `Bearer ${settings.mercadopago_access_token}`,
              },
            });

            if (mpResponse.ok) {
              const paymentData = await mpResponse.json();
              appointmentId = paymentData.external_reference;
              console.log('Found appointment via MP API:', appointmentId, 'Status:', paymentData.status);

              // Update appointment based on payment status
              let paymentStatus = 'pending';
              
              switch (paymentData.status) {
                case 'approved':
                  paymentStatus = paymentData.metadata?.payment_type === 'deposit' ? 'partial' : 'paid_online';
                  break;
                case 'pending':
                case 'in_process':
                  paymentStatus = 'pending';
                  break;
                case 'rejected':
                case 'cancelled':
                  paymentStatus = 'pending'; // Keep as pending so they can try again
                  break;
                case 'refunded':
                  paymentStatus = 'refunded';
                  break;
              }

              // Update the appointment
              const { error: updateError } = await supabase
                .from('appointments')
                .update({
                  payment_status: paymentStatus,
                  payment_amount: paymentData.transaction_amount,
                })
                .eq('id', appointmentId);

              if (updateError) {
                console.error('Error updating appointment:', updateError);
              } else {
                console.log('Appointment updated successfully:', appointmentId, paymentStatus);
              }

              // If payment is approved, try to send WhatsApp notification
              if (paymentStatus === 'paid_online' || paymentStatus === 'partial') {
                // Get appointment details
                const { data: appointment } = await supabase
                  .from('appointments')
                  .select('*, barbershops!inner(name, phone)')
                  .eq('id', appointmentId)
                  .single();

                if (appointment?.client_phone) {
                  try {
                    // Send payment confirmation via WhatsApp
                    await supabase.functions.invoke('send-whatsapp', {
                      body: {
                        barbershopId: appointment.barbershop_id,
                        phone: appointment.client_phone,
                        message: `✅ *Pagamento Confirmado!*\n\nOlá ${appointment.client_name}!\n\nSeu pagamento de *R$ ${paymentData.transaction_amount.toFixed(2)}* foi confirmado.\n\n📅 Agendamento: ${appointment.appointment_date} às ${appointment.appointment_time}\n\nAguardamos você!`,
                        type: 'payment_confirmed',
                      },
                    });
                    console.log('WhatsApp notification sent');
                  } catch (whatsappError) {
                    console.error('Error sending WhatsApp:', whatsappError);
                  }
                }
              }

              break;
            }
          } catch (mpError) {
            console.log('Could not fetch payment from this account:', mpError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, processed: !!appointmentId }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent Mercado Pago from retrying
    return new Response(JSON.stringify({ received: true, error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
