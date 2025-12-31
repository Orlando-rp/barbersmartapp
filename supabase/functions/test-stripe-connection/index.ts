import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { secretKey } = await req.json();

    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Secret key is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test Stripe connection by fetching account info
    const response = await fetch('https://api.stripe.com/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error?.message || 'Invalid API key' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Stripe connection successful:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        account: {
          id: data.id,
          business_name: data.business_profile?.name || data.settings?.dashboard?.display_name,
          email: data.email,
          country: data.country,
          default_currency: data.default_currency,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to connect to Stripe' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
