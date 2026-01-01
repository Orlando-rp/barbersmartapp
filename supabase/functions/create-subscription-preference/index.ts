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

    console.log('[create-subscription-preference] Request received:', { 
      planId, 
      planName, 
      planPrice, 
      barbershopId,
      barbershopName,
      userEmail,
      userId 
    });

    // Validate required fields
    if (!planId || !planPrice || !barbershopId) {
      console.error('[create-subscription-preference] Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          code: 'MISSING_FIELDS',
          message: 'planId, planPrice e barbershopId são obrigatórios'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[create-subscription-preference] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          code: 'CONFIG_ERROR',
          message: 'Configuração do servidor incompleta'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch global payment config for MercadoPago credentials
    console.log('[create-subscription-preference] Fetching payment configuration...');
    const { data: paymentConfig, error: configError } = await supabase
      .from('global_payment_config')
      .select('mercadopago_access_token, mercadopago_enabled, stripe_enabled')
      .maybeSingle();

    if (configError) {
      console.error('[create-subscription-preference] Error fetching payment config:', configError);
      return new Response(
        JSON.stringify({ 
          error: 'Payment configuration error',
          code: 'CONFIG_FETCH_ERROR',
          message: 'Erro ao buscar configuração de pagamento'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig) {
      console.error('[create-subscription-preference] No payment configuration found');
      return new Response(
        JSON.stringify({ 
          error: 'Payment not configured',
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'Nenhuma configuração de pagamento encontrada. Configure o MercadoPago no painel de administração.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-subscription-preference] Payment config status:', {
      mercadopago_enabled: paymentConfig.mercadopago_enabled,
      has_mp_token: !!paymentConfig.mercadopago_access_token,
      stripe_enabled: paymentConfig.stripe_enabled
    });

    if (!paymentConfig.mercadopago_enabled) {
      console.error('[create-subscription-preference] MercadoPago is not enabled');
      return new Response(
        JSON.stringify({ 
          error: 'MercadoPago not enabled',
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'MercadoPago não está habilitado. Ative nas configurações globais de pagamento.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentConfig.mercadopago_access_token) {
      console.error('[create-subscription-preference] MercadoPago access token missing');
      return new Response(
        JSON.stringify({ 
          error: 'MercadoPago token missing',
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'Token de acesso do MercadoPago não configurado.'
        }),
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

    console.log('[create-subscription-preference] Creating MercadoPago preference...');

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
      console.error('[create-subscription-preference] MercadoPago API error:', {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        body: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'MercadoPago API error',
          code: 'MP_API_ERROR',
          message: 'Erro ao criar preferência de pagamento no MercadoPago. Verifique se o token de acesso é válido.',
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();
    console.log('[create-subscription-preference] MercadoPago preference created:', preference.id);

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
      console.error('[create-subscription-preference] Error storing pending subscription:', subscriptionError);
      // Continue anyway - payment can still proceed
    } else {
      console.log('[create-subscription-preference] Pending subscription stored successfully');
    }

    console.log('[create-subscription-preference] Success! Returning payment URLs');

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
    console.error('[create-subscription-preference] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message || 'Erro interno do servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});