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
    const { 
      barbershopId, 
      appointmentId, 
      serviceName, 
      servicePrice, 
      clientName, 
      clientEmail,
      depositOnly = false 
    } = await req.json();

    console.log('Creating Stripe payment for:', { barbershopId, appointmentId, serviceName, servicePrice });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get payment settings for this barbershop
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    let secretKey: string | null = null;

    // Check if using global credentials or barbershop's own
    if (paymentSettings?.use_global_credentials || !paymentSettings?.stripe_secret_key) {
      // Get global config
      const { data: globalConfig } = await supabase
        .from('global_payment_config')
        .select('stripe_secret_key, stripe_enabled')
        .single();
      
      if (!globalConfig?.stripe_enabled || !globalConfig?.stripe_secret_key) {
        return new Response(
          JSON.stringify({ error: 'Stripe não configurado globalmente' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      secretKey = globalConfig.stripe_secret_key;
    } else {
      secretKey = paymentSettings.stripe_secret_key;
    }

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'Secret Key do Stripe não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the amount to charge (Stripe uses cents)
    let amount = servicePrice;
    let paymentType = 'full';
    
    if (depositOnly && paymentSettings?.require_deposit && paymentSettings?.deposit_percentage > 0) {
      amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
      paymentType = 'deposit';
    }

    const amountInCents = Math.round(amount * 100);

    // Get the origin for back URLs
    const origin = req.headers.get('origin') || 'https://nmsblmmhigwsevnqmhwn.supabase.co';

    // Create Stripe Checkout Session
    const sessionData = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': 'brl',
      'line_items[0][price_data][product_data][name]': serviceName,
      'line_items[0][price_data][product_data][description]': paymentType === 'deposit' 
        ? `Sinal de ${paymentSettings?.deposit_percentage}% - ${serviceName}` 
        : serviceName,
      'line_items[0][price_data][unit_amount]': amountInCents.toString(),
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${origin}/booking/success?appointment=${appointmentId}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${origin}/booking/failure?appointment=${appointmentId}`,
      'client_reference_id': appointmentId,
      'metadata[barbershop_id]': barbershopId,
      'metadata[appointment_id]': appointmentId,
      'metadata[payment_type]': paymentType,
      'metadata[original_price]': servicePrice.toString(),
    });

    if (clientEmail) {
      sessionData.append('customer_email', clientEmail);
    }

    console.log('Creating Stripe checkout session...');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionData.toString(),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar sessão de pagamento', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripeResponse.json();
    console.log('Stripe session created:', session.id);

    // Update appointment with payment info
    await supabase
      .from('appointments')
      .update({
        payment_status: 'pending',
        payment_method_chosen: 'online',
        payment_gateway: 'stripe',
        payment_id: session.id,
        payment_amount: amount,
      })
      .eq('id', appointmentId);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        checkoutUrl: session.url,
        amount,
        paymentType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Stripe payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar pagamento', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
