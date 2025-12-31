import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Subscription webhook received:', JSON.stringify(body, null, 2));

    // MercadoPago sends different notification types
    const { type, data, action } = body;

    // Only process payment notifications
    if (type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') {
      console.log('Ignoring non-payment notification:', type, action);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get MercadoPago access token
    const { data: paymentConfig } = await supabase
      .from('global_payment_config')
      .select('mercadopago_access_token')
      .single();

    if (!paymentConfig?.mercadopago_access_token) {
      console.error('No MercadoPago token configured');
      return new Response(JSON.stringify({ error: 'Payment not configured' }), {
        status: 200, // Return 200 to avoid MP retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch payment details from MercadoPago
    const paymentId = data?.id;
    if (!paymentId) {
      console.error('No payment ID in webhook');
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${paymentConfig.mercadopago_access_token}`,
      },
    });

    if (!mpResponse.ok) {
      console.error('Failed to fetch payment from MercadoPago');
      return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payment = await mpResponse.json();
    console.log('Payment details:', JSON.stringify(payment, null, 2));

    const externalReference = payment.external_reference;
    const paymentStatus = payment.status;
    const metadata = payment.metadata || {};

    // Only process subscription payments
    if (!externalReference?.startsWith('sub_') && metadata.type !== 'subscription') {
      console.log('Not a subscription payment, ignoring');
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse barbershop and plan from external reference
    let barbershopId = metadata.barbershop_id;
    let planId = metadata.plan_id;

    if (!barbershopId || !planId) {
      // Try to parse from external_reference: sub_barbershopId_planId_timestamp
      const parts = externalReference?.split('_') || [];
      if (parts.length >= 3) {
        barbershopId = parts[1];
        planId = parts[2];
      }
    }

    if (!barbershopId || !planId) {
      console.error('Could not determine barbershop or plan');
      return new Response(JSON.stringify({ error: 'Invalid reference' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing subscription for:', { barbershopId, planId, paymentStatus });

    // Map MercadoPago status to our status
    let subscriptionStatus: string;
    let validUntil: string | null = null;

    switch (paymentStatus) {
      case 'approved':
        subscriptionStatus = 'active';
        // Set valid_until to 30 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        validUntil = futureDate.toISOString();
        break;
      case 'pending':
      case 'in_process':
      case 'authorized':
        subscriptionStatus = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        subscriptionStatus = 'cancelled';
        break;
      default:
        subscriptionStatus = 'pending';
    }

    // Update subscription
    const updateData: Record<string, any> = {
      status: subscriptionStatus,
      payment_id: paymentId.toString(),
      payment_reference: externalReference,
      updated_at: new Date().toISOString()
    };

    if (validUntil) {
      updateData.valid_until = validUntil;
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        barbershop_id: barbershopId,
        plan_id: planId,
        ...updateData,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'barbershop_id'
      });

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    } else {
      console.log('Subscription updated successfully:', { barbershopId, status: subscriptionStatus });
    }

    // If payment approved, send confirmation notification
    if (paymentStatus === 'approved') {
      // Get barbershop details for notification
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('name, phone')
        .eq('id', barbershopId)
        .single();

      if (barbershop?.phone) {
        // Send WhatsApp notification
        try {
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: barbershop.phone,
              message: `✅ Pagamento confirmado!\n\nSua assinatura do plano ${metadata.plan_name || 'selecionado'} foi ativada com sucesso.\n\nAgradecemos pela confiança!\n- Equipe BarberSmart`
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Don't fail the webhook
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent MercadoPago from retrying
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
