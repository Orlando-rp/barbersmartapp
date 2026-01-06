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
      // =====================================
      // SUBSCRIPTION EVENTS (Mensalidades)
      // =====================================
      
      case 'customer.subscription.created': {
        const subscription = object;
        const barbershopId = subscription.metadata?.barbershop_id;
        const planId = subscription.metadata?.plan_id;
        
        console.log(`Subscription created: ${subscription.id} for barbershop: ${barbershopId}`);
        
        if (barbershopId) {
          const { error } = await supabase
            .from('subscriptions')
            .upsert({
              barbershop_id: barbershopId,
              plan_id: planId,
              status: subscription.status === 'active' ? 'active' : 'pending',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'barbershop_id'
            });

          if (error) {
            console.error('Error creating subscription:', error);
          } else {
            console.log('Subscription created successfully');
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = object;
        const barbershopId = subscription.metadata?.barbershop_id;
        
        console.log(`Subscription updated: ${subscription.id} status: ${subscription.status}`);
        
        if (barbershopId) {
          // Map Stripe status to our status
          let status = 'active';
          if (subscription.status === 'canceled' || subscription.status === 'cancelled') {
            status = 'cancelled';
          } else if (subscription.status === 'past_due') {
            status = 'past_due';
          } else if (subscription.status === 'unpaid') {
            status = 'unpaid';
          } else if (subscription.status === 'trialing') {
            status = 'trialing';
          }

          const { error } = await supabase
            .from('subscriptions')
            .update({
              status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('barbershop_id', barbershopId);

          if (error) {
            console.error('Error updating subscription:', error);
          } else {
            console.log(`Subscription updated to status: ${status}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = object;
        const barbershopId = subscription.metadata?.barbershop_id;
        
        console.log(`Subscription deleted: ${subscription.id} for barbershop: ${barbershopId}`);
        
        if (barbershopId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('barbershop_id', barbershopId);

          if (error) {
            console.error('Error cancelling subscription:', error);
          } else {
            console.log('Subscription cancelled successfully');
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = object;
        const subscriptionId = invoice.subscription;
        const barbershopId = invoice.subscription_details?.metadata?.barbershop_id 
          || invoice.lines?.data?.[0]?.metadata?.barbershop_id;
        
        console.log(`Invoice paid: ${invoice.id} for subscription: ${subscriptionId}`);
        
        if (barbershopId) {
          // Update subscription to active and extend period
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_end: invoice.lines?.data?.[0]?.period?.end 
                ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
                : undefined,
              updated_at: new Date().toISOString()
            })
            .eq('barbershop_id', barbershopId);

          if (error) {
            console.error('Error updating subscription after invoice paid:', error);
          } else {
            console.log('Subscription renewed after payment');
            
            // TODO: Send WhatsApp notification
            // await sendWhatsAppNotification(barbershopId, 'payment_confirmed');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = object;
        const barbershopId = invoice.subscription_details?.metadata?.barbershop_id 
          || invoice.lines?.data?.[0]?.metadata?.barbershop_id;
        
        console.log(`Invoice payment failed: ${invoice.id}`);
        
        if (barbershopId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('barbershop_id', barbershopId);

          if (error) {
            console.error('Error updating subscription after payment failed:', error);
          } else {
            console.log('Subscription marked as past_due');
            
            // TODO: Send WhatsApp notification about payment failure
            // await sendWhatsAppNotification(barbershopId, 'payment_failed');
          }
        }
        break;
      }

      // =====================================
      // APPOINTMENT PAYMENT EVENTS
      // =====================================

      case 'checkout.session.completed': {
        const session = object;
        
        // Check if it's a subscription checkout or appointment checkout
        if (session.mode === 'subscription') {
          // Handle subscription checkout
          const barbershopId = session.metadata?.barbershop_id;
          const planId = session.metadata?.plan_id;
          
          console.log(`Subscription checkout completed for barbershop: ${barbershopId}`);
          
          if (barbershopId && session.subscription) {
            const { error } = await supabase
              .from('subscriptions')
              .upsert({
                barbershop_id: barbershopId,
                plan_id: planId,
                status: 'active',
                current_period_start: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'barbershop_id'
              });

            if (error) {
              console.error('Error creating subscription from checkout:', error);
            } else {
              console.log('Subscription activated from checkout');
            }
          }
        } else {
          // Handle appointment payment checkout
          const appointmentId = session.client_reference_id || session.metadata?.appointment_id;
          
          if (!appointmentId) {
            console.log('No appointment ID in session');
            break;
          }

          console.log(`Checkout session completed for appointment: ${appointmentId}`);

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
            await supabase
              .from('appointments')
              .update({ status: 'confirmed' })
              .eq('id', appointmentId);
            
            console.log('Appointment confirmed after payment');
          }
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
