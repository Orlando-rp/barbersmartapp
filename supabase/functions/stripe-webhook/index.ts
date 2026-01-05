import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('Stripe webhook received:', payload.type);

    const { type, data } = payload;
    const object = data?.object;

    if (!object) {
      console.log('No object in webhook payload');
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    switch (type) {
      case 'checkout.session.completed': {
        const session = object;
        const appointmentId = session.client_reference_id || session.metadata?.appointment_id;
        
        if (!appointmentId) {
          console.log('No appointment ID in session');
          break;
        }

        console.log(`Checkout session completed for appointment: ${appointmentId}`);

        // Update appointment payment status
        const { error } = await supabase
          .from('appointments')
          .update({
            payment_status: 'paid_online',
            payment_id: session.id,
          })
          .eq('id', appointmentId);

        if (error) {
          console.error('Error updating appointment:', error);
        } else {
          // Also update appointment status to confirmed
          await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', appointmentId);
          
          console.log('Appointment confirmed after payment');
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = object;
        const appointmentId = session.client_reference_id || session.metadata?.appointment_id;
        
        if (appointmentId) {
          console.log(`Checkout session expired for appointment: ${appointmentId}`);
          
          await supabase
            .from('appointments')
            .update({ payment_status: 'expired' })
            .eq('id', appointmentId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = object;
        const appointmentId = paymentIntent.metadata?.appointment_id;
        
        if (appointmentId) {
          console.log(`Payment succeeded for appointment: ${appointmentId}`);
          
          await supabase
            .from('appointments')
            .update({
              payment_status: 'paid_online',
              payment_id: paymentIntent.id,
            })
            .eq('id', appointmentId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = object;
        const appointmentId = paymentIntent.metadata?.appointment_id;
        
        if (appointmentId) {
          console.log(`Payment failed for appointment: ${appointmentId}`);
          
          await supabase
            .from('appointments')
            .update({ payment_status: 'failed' })
            .eq('id', appointmentId);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = object;
        const appointmentId = charge.metadata?.appointment_id;
        
        if (appointmentId) {
          console.log(`Charge refunded for appointment: ${appointmentId}`);
          
          await supabase
            .from('appointments')
            .update({ payment_status: 'refunded' })
            .eq('id', appointmentId);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
