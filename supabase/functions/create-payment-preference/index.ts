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
      clientCpfCnpj,
      clientPhone,
      billingType,
      depositOnly = false,
      gateway // Optional: force specific gateway
    } = await req.json();

    console.log('Creating payment for:', { barbershopId, appointmentId, serviceName, servicePrice, gateway });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get payment settings for this barbershop
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .single();

    // Determine which gateway to use
    let selectedGateway = gateway || paymentSettings?.preferred_gateway || 'mercadopago';

    // If using global credentials, check which gateways are enabled
    if (paymentSettings?.use_global_credentials || !paymentSettings) {
      const { data: globalConfig } = await supabase
        .from('global_payment_config')
        .select('*')
        .single();

      if (globalConfig) {
        // If preferred gateway is not enabled globally, find an enabled one
        if (selectedGateway === 'stripe' && !globalConfig.stripe_enabled) {
          selectedGateway = globalConfig.mercadopago_enabled ? 'mercadopago' : 
                           globalConfig.asaas_enabled ? 'asaas' : null;
        } else if (selectedGateway === 'mercadopago' && !globalConfig.mercadopago_enabled) {
          selectedGateway = globalConfig.stripe_enabled ? 'stripe' : 
                           globalConfig.asaas_enabled ? 'asaas' : null;
        } else if (selectedGateway === 'asaas' && !globalConfig.asaas_enabled) {
          selectedGateway = globalConfig.mercadopago_enabled ? 'mercadopago' : 
                           globalConfig.stripe_enabled ? 'stripe' : null;
        }
      }
    }

    if (!selectedGateway) {
      return new Response(
        JSON.stringify({ error: 'Nenhum gateway de pagamento configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Selected gateway:', selectedGateway);

    // Route to appropriate gateway
    switch (selectedGateway) {
      case 'stripe':
        return await createStripePayment(req, supabase, {
          barbershopId, appointmentId, serviceName, servicePrice, 
          clientName, clientEmail, depositOnly, paymentSettings
        });

      case 'asaas':
        return await createAsaasPayment(req, supabase, {
          barbershopId, appointmentId, serviceName, servicePrice, 
          clientName, clientEmail, clientCpfCnpj, clientPhone,
          billingType, depositOnly, paymentSettings
        });

      case 'mercadopago':
      default:
        return await createMercadoPagoPayment(req, supabase, {
          barbershopId, appointmentId, serviceName, servicePrice, 
          clientName, clientEmail, depositOnly, paymentSettings
        });
    }

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar pagamento', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createMercadoPagoPayment(req: Request, supabase: any, params: any) {
  const { barbershopId, appointmentId, serviceName, servicePrice, clientName, clientEmail, depositOnly, paymentSettings } = params;

  let accessToken: string | null = null;

  if (paymentSettings?.use_global_credentials || !paymentSettings?.mercadopago_access_token) {
    const { data: globalConfig } = await supabase
      .from('global_payment_config')
      .select('mercadopago_access_token')
      .single();
    accessToken = globalConfig?.mercadopago_access_token;
  } else {
    accessToken = paymentSettings.mercadopago_access_token;
  }

  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let amount = servicePrice;
  let paymentType = 'full';
  
  if (depositOnly && paymentSettings?.require_deposit && paymentSettings?.deposit_percentage > 0) {
    amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
    paymentType = 'deposit';
  }

  const origin = req.headers.get('origin') || 'https://nmsblmmhigwsevnqmhwn.supabase.co';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  const preferenceData = {
    items: [{
      id: appointmentId,
      title: serviceName,
      description: paymentType === 'deposit' 
        ? `Sinal de ${paymentSettings?.deposit_percentage}% - ${serviceName}` 
        : serviceName,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(amount.toFixed(2)),
    }],
    payer: {
      name: clientName,
      email: clientEmail || undefined,
    },
    back_urls: {
      success: `${origin}/booking/success?appointment=${appointmentId}`,
      failure: `${origin}/booking/failure?appointment=${appointmentId}`,
      pending: `${origin}/booking/pending?appointment=${appointmentId}`,
    },
    auto_return: 'approved',
    external_reference: appointmentId,
    notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    metadata: {
      barbershop_id: barbershopId,
      appointment_id: appointmentId,
      payment_type: paymentType,
      original_price: servicePrice,
    },
  };

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
    console.error('Mercado Pago error:', errorText);
    return new Response(
      JSON.stringify({ error: 'Erro ao criar preferência de pagamento', details: errorText }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const preference = await mpResponse.json();

  await supabase
    .from('appointments')
    .update({
      payment_status: 'pending',
      payment_method_chosen: 'online',
      payment_gateway: 'mercadopago',
      payment_id: preference.id,
      payment_amount: amount,
    })
    .eq('id', appointmentId);

  return new Response(
    JSON.stringify({
      gateway: 'mercadopago',
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      amount,
      paymentType,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createStripePayment(req: Request, supabase: any, params: any) {
  const { barbershopId, appointmentId, serviceName, servicePrice, clientName, clientEmail, depositOnly, paymentSettings } = params;

  let secretKey: string | null = null;

  if (paymentSettings?.use_global_credentials || !paymentSettings?.stripe_secret_key) {
    const { data: globalConfig } = await supabase
      .from('global_payment_config')
      .select('stripe_secret_key')
      .single();
    secretKey = globalConfig?.stripe_secret_key;
  } else {
    secretKey = paymentSettings.stripe_secret_key;
  }

  if (!secretKey) {
    return new Response(
      JSON.stringify({ error: 'Secret Key do Stripe não configurada' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let amount = servicePrice;
  let paymentType = 'full';
  
  if (depositOnly && paymentSettings?.require_deposit && paymentSettings?.deposit_percentage > 0) {
    amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
    paymentType = 'deposit';
  }

  const amountInCents = Math.round(amount * 100);
  const origin = req.headers.get('origin') || 'https://nmsblmmhigwsevnqmhwn.supabase.co';

  const sessionData = new URLSearchParams({
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'brl',
    'line_items[0][price_data][product_data][name]': serviceName,
    'line_items[0][price_data][unit_amount]': amountInCents.toString(),
    'line_items[0][quantity]': '1',
    'mode': 'payment',
    'success_url': `${origin}/booking/success?appointment=${appointmentId}&session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${origin}/booking/failure?appointment=${appointmentId}`,
    'client_reference_id': appointmentId,
    'metadata[barbershop_id]': barbershopId,
    'metadata[appointment_id]': appointmentId,
    'metadata[payment_type]': paymentType,
  });

  if (clientEmail) {
    sessionData.append('customer_email', clientEmail);
  }

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
      gateway: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
      amount,
      paymentType,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createAsaasPayment(req: Request, supabase: any, params: any) {
  const { barbershopId, appointmentId, serviceName, servicePrice, clientName, clientEmail, clientCpfCnpj, clientPhone, billingType = 'PIX', depositOnly, paymentSettings } = params;

  let apiKey: string | null = null;

  if (paymentSettings?.use_global_credentials || !paymentSettings?.asaas_api_key) {
    const { data: globalConfig } = await supabase
      .from('global_payment_config')
      .select('asaas_api_key')
      .single();
    apiKey = globalConfig?.asaas_api_key;
  } else {
    apiKey = paymentSettings.asaas_api_key;
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API Key do Asaas não configurada' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let amount = servicePrice;
  let paymentType = 'full';
  
  if (depositOnly && paymentSettings?.require_deposit && paymentSettings?.deposit_percentage > 0) {
    amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
    paymentType = 'deposit';
  }

  // Create or find customer
  let customerId: string | null = null;

  if (clientCpfCnpj) {
    const searchResponse = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${clientCpfCnpj}`, {
      headers: { 'access_token': apiKey },
    });
    const searchData = await searchResponse.json();
    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    }
  }

  if (!customerId) {
    const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: clientName,
        email: clientEmail || undefined,
        cpfCnpj: clientCpfCnpj || undefined,
        phone: clientPhone || undefined,
      }),
    });

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      return new Response(
        JSON.stringify({ error: 'Erro ao criar cliente no Asaas', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = await customerResponse.json();
    customerId = customer.id;
  }

  const dueDate = new Date();
  if (billingType === 'BOLETO') {
    dueDate.setDate(dueDate.getDate() + 3);
  }

  const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
    method: 'POST',
    headers: {
      'access_token': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: Number(amount.toFixed(2)),
      dueDate: dueDate.toISOString().split('T')[0],
      description: serviceName,
      externalReference: appointmentId,
    }),
  });

  if (!paymentResponse.ok) {
    const errorText = await paymentResponse.text();
    return new Response(
      JSON.stringify({ error: 'Erro ao criar pagamento no Asaas', details: errorText }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const payment = await paymentResponse.json();

  let pixQrCode = null;
  let pixCopyPaste = null;

  if (billingType === 'PIX') {
    const pixResponse = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
      headers: { 'access_token': apiKey },
    });
    
    if (pixResponse.ok) {
      const pixData = await pixResponse.json();
      pixQrCode = pixData.encodedImage;
      pixCopyPaste = pixData.payload;
    }
  }

  await supabase
    .from('appointments')
    .update({
      payment_status: 'pending',
      payment_method_chosen: 'online',
      payment_gateway: 'asaas',
      payment_id: payment.id,
      payment_amount: amount,
    })
    .eq('id', appointmentId);

  return new Response(
    JSON.stringify({
      gateway: 'asaas',
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      pixQrCode,
      pixCopyPaste,
      amount,
      paymentType,
      billingType,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
