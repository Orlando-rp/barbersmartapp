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
    const { 
      planId, 
      planName, 
      planPrice, 
      barbershopId, 
      barbershopName,
      userEmail,
      userId 
    } = await req.json();

    console.log('Creating subscription preference:', { planId, planName, planPrice, barbershopId });

    if (!planId || !planPrice || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch global payment config for MercadoPago credentials
    const { data: paymentConfig, error: configError } = await supabase
      .from('global_payment_config')
      .select('mercadopago_access_token, mercadopago_enabled')
      .single();

    if (configError || !paymentConfig) {
      console.error('Error fetching payment config:', configError);
      return new Response(
        JSON.stringify({ error: 'Payment configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig.mercadopago_enabled || !paymentConfig.mercadopago_access_token) {
      console.error('MercadoPago not enabled or missing token');
      return new Response(
        JSON.stringify({ error: 'MercadoPago payment not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = paymentConfig.mercadopago_access_token;

    // Generate external reference for tracking
    const externalReference = `sub_${barbershopId}_${planId}_${Date.now()}`;

    // Get base URL for callbacks
    const baseUrl = req.headers.get('origin') || 'https://barbersmart.app';

    // Create MercadoPago preference
    const preferenceData = {
      items: [
        {
          id: planId,
          title: `Assinatura ${planName} - ${barbershopName}`,
          description: `Plano ${planName} mensal para ${barbershopName}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: planPrice,
        },
      ],
      payer: {
        email: userEmail || '',
      },
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/subscription/success`,
        failure: `${baseUrl}/subscription/success`,
        pending: `${baseUrl}/subscription/success`,
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/subscription-webhook`,
      statement_descriptor: 'BARBERSMART',
      metadata: {
        barbershop_id: barbershopId,
        plan_id: planId,
        plan_name: planName,
        user_id: userId,
        type: 'subscription'
      },
    };

    console.log('Creating MercadoPago preference:', JSON.stringify(preferenceData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MercadoPago API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment preference', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();
    console.log('MercadoPago preference created:', preference.id);

    // Store pending subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        barbershop_id: barbershopId,
        plan_id: planId,
        status: 'pending',
        payment_reference: externalReference,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'barbershop_id'
      });

    if (subscriptionError) {
      console.error('Error storing pending subscription:', subscriptionError);
      // Continue anyway - payment can still proceed
    }

    return new Response(
      JSON.stringify({
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        external_reference: externalReference
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
