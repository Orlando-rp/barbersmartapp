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
      billingType = 'PIX', // PIX, BOLETO, CREDIT_CARD
      depositOnly = false 
    } = await req.json();

    console.log('Creating Asaas payment for:', { barbershopId, appointmentId, serviceName, servicePrice, billingType });

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

    let apiKey: string | null = null;

    // Check if using global credentials or barbershop's own
    if (paymentSettings?.use_global_credentials || !paymentSettings?.asaas_api_key) {
      // Get global config
      const { data: globalConfig } = await supabase
        .from('global_payment_config')
        .select('asaas_api_key, asaas_enabled')
        .single();
      
      if (!globalConfig?.asaas_enabled || !globalConfig?.asaas_api_key) {
        return new Response(
          JSON.stringify({ error: 'Asaas não configurado globalmente' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      apiKey = globalConfig.asaas_api_key;
    } else {
      apiKey = paymentSettings.asaas_api_key;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key do Asaas não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the amount to charge
    let amount = servicePrice;
    let paymentType = 'full';
    
    if (depositOnly && paymentSettings?.require_deposit && paymentSettings?.deposit_percentage > 0) {
      amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
      paymentType = 'deposit';
    }

    // First, create or find customer
    let customerId: string | null = null;

    // Search for existing customer by CPF/CNPJ or email
    if (clientCpfCnpj) {
      const searchResponse = await fetch(`https://api.asaas.com/v3/customers?cpfCnpj=${clientCpfCnpj}`, {
        headers: { 'access_token': apiKey },
      });
      const searchData = await searchResponse.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    }

    // Create customer if not found
    if (!customerId) {
      const customerData = {
        name: clientName,
        email: clientEmail || undefined,
        cpfCnpj: clientCpfCnpj || undefined,
        phone: clientPhone || undefined,
        notificationDisabled: false,
      };

      const customerResponse = await fetch('https://api.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('Failed to create Asaas customer:', errorText);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar cliente no Asaas', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customer = await customerResponse.json();
      customerId = customer.id;
    }

    // Calculate due date (today + 3 days for boleto, immediate for PIX)
    const dueDate = new Date();
    if (billingType === 'BOLETO') {
      dueDate.setDate(dueDate.getDate() + 3);
    }

    // Create payment
    const paymentData = {
      customer: customerId,
      billingType,
      value: Number(amount.toFixed(2)),
      dueDate: dueDate.toISOString().split('T')[0],
      description: paymentType === 'deposit' 
        ? `Sinal de ${paymentSettings?.deposit_percentage}% - ${serviceName}` 
        : serviceName,
      externalReference: appointmentId,
    };

    console.log('Creating Asaas payment:', paymentData);

    const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Asaas payment error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pagamento no Asaas', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = await paymentResponse.json();
    console.log('Asaas payment created:', payment.id);

    // Get payment link (PIX or invoice URL)
    let paymentUrl = payment.invoiceUrl;
    let pixQrCode = null;
    let pixCopyPaste = null;

    if (billingType === 'PIX') {
      // Get PIX QR Code
      const pixResponse = await fetch(`https://api.asaas.com/v3/payments/${payment.id}/pixQrCode`, {
        headers: { 'access_token': apiKey },
      });
      
      if (pixResponse.ok) {
        const pixData = await pixResponse.json();
        pixQrCode = pixData.encodedImage;
        pixCopyPaste = pixData.payload;
      }
    }

    // Update appointment with payment info
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
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode,
        pixCopyPaste,
        amount,
        paymentType,
        billingType,
        status: payment.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Asaas payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar pagamento', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
