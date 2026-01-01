import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subdomain, barbershopId } = await req.json();
    
    console.log(`Checking SSL for subdomain: ${subdomain}`);

    if (!subdomain) {
      return new Response(
        JSON.stringify({ error: 'Subdomain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpanelDomain = Deno.env.get('CPANEL_DOMAIN') || 'barbersmart.app';
    const fullSubdomain = subdomain.includes('.') ? subdomain : `${subdomain}.${cpanelDomain}`;

    // Tentar fazer uma requisição HTTPS ao subdomínio
    let sslActive = false;
    let sslError = null;

    try {
      const testUrl = `https://${fullSubdomain}`;
      console.log(`Testing SSL at: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        redirect: 'manual'
      });

      // Se a requisição HTTPS foi bem sucedida (qualquer status), SSL está ativo
      sslActive = true;
      console.log(`SSL is active for ${fullSubdomain}, status: ${response.status}`);
    } catch (err) {
      sslError = err.message;
      console.log(`SSL check failed for ${fullSubdomain}: ${sslError}`);
      
      // Verificar se o erro é relacionado a certificado
      if (sslError.includes('certificate') || 
          sslError.includes('SSL') || 
          sslError.includes('TLS')) {
        sslActive = false;
      }
    }

    // Atualizar status no banco se barbershopId foi fornecido
    if (barbershopId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('barbershop_domains')
        .update({
          ssl_status: sslActive ? 'active' : 'provisioning',
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId);

      if (updateError) {
        console.error('Error updating database:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subdomain: fullSubdomain,
        sslActive,
        sslError,
        message: sslActive 
          ? 'SSL está ativo para este subdomínio.' 
          : 'SSL ainda está sendo provisionado. Tente novamente em alguns minutos.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking SSL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
