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

    console.log('Creating payment preference for:', { barbershopId, appointmentId, serviceName, servicePrice });

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

    if (settingsError || !paymentSettings) {
      console.error('Payment settings not found:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Configurações de pagamento não encontradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentSettings.mercadopago_access_token) {
      return new Response(
        JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the amount to charge
    let amount = servicePrice;
    let paymentType = 'full';
    
    if (depositOnly && paymentSettings.require_deposit && paymentSettings.deposit_percentage > 0) {
      amount = (servicePrice * paymentSettings.deposit_percentage) / 100;
      paymentType = 'deposit';
    }

    // Get the origin for back URLs (use referer or default)
    const origin = req.headers.get('origin') || 'https://nmsblmmhigwsevnqmhwn.supabase.co';

    // Create Mercado Pago preference
    const preferenceData = {
      items: [{
        id: appointmentId,
        title: serviceName,
        description: paymentType === 'deposit' 
          ? `Sinal de ${paymentSettings.deposit_percentage}% - ${serviceName}` 
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

    console.log('Creating preference with Mercado Pago:', preferenceData);

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paymentSettings.mercadopago_access_token}`,
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
    console.log('Preference created:', preference.id);

    // Update appointment with payment info
    await supabase
      .from('appointments')
      .update({
        payment_status: 'pending',
        payment_method_chosen: 'online',
        payment_id: preference.id,
        payment_amount: amount,
      })
      .eq('id', appointmentId);

    return new Response(
      JSON.stringify({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        amount,
        paymentType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating payment preference:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar pagamento', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
