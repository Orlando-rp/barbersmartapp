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
    const { accessToken } = await req.json();

    if (!accessToken) {
      console.log('Access token não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'Access token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Testando conexão com Mercado Pago...');

    // Test the access token by calling the Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (mpResponse.ok) {
      const userData = await mpResponse.json();
      console.log('Conexão estabelecida com sucesso. User ID:', userData.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: userData.id,
            email: userData.email,
            nickname: userData.nickname,
            first_name: userData.first_name,
            last_name: userData.last_name
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorText = await mpResponse.text();
      console.error('Erro na API do Mercado Pago:', mpResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido ou expirado',
          details: errorText 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro ao testar conexão', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
