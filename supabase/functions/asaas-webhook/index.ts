import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('Asaas webhook received:', JSON.stringify(payload, null, 2));

    const { event, payment } = payload;

    if (!payment || !payment.externalReference) {
      console.log('No payment or external reference in webhook');
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentId = payment.externalReference;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map Asaas events to payment status
    let paymentStatus: string;
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        paymentStatus = 'paid_online';
        break;
      case 'PAYMENT_OVERDUE':
        paymentStatus = 'overdue';
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        paymentStatus = 'refunded';
        break;
      case 'PAYMENT_UPDATED':
        // Keep current status or update based on payment.status
        if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
          paymentStatus = 'paid_online';
        } else if (payment.status === 'PENDING') {
          paymentStatus = 'pending';
        } else if (payment.status === 'REFUNDED') {
          paymentStatus = 'refunded';
        } else {
          console.log('Payment update with status:', payment.status);
          return new Response(
            JSON.stringify({ received: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      case 'PAYMENT_CREATED':
        paymentStatus = 'pending';
        break;
      default:
        console.log('Unhandled event:', event);
        return new Response(
          JSON.stringify({ received: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Updating appointment ${appointmentId} with status: ${paymentStatus}`);

    // Update appointment payment status
    const { error } = await supabase
      .from('appointments')
      .update({
        payment_status: paymentStatus,
        payment_id: payment.id,
      })
      .eq('id', appointmentId);

    if (error) {
      console.error('Error updating appointment:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment confirmed, update appointment status to confirmed
    if (paymentStatus === 'paid_online') {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);
      
      console.log('Appointment confirmed after payment');
    }

    return new Response(
      JSON.stringify({ received: true, status: paymentStatus }),
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
