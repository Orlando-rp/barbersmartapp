import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testing Asaas connection...');

    // Test connection by fetching account info
    const response = await fetch('https://api.asaas.com/v3/myAccount', {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Asaas API error:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: response.status === 401 ? 'API Key inválida' : 'Erro ao conectar com Asaas'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const account = await response.json();
    console.log('Asaas account:', account.name || account.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        account: {
          name: account.name,
          email: account.email,
          cpfCnpj: account.cpfCnpj,
          company: account.company,
          tradingName: account.tradingName,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing Asaas connection:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao testar conexão' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
