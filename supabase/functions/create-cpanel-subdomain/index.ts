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
    
    console.log(`Creating subdomain: ${subdomain} for barbershop: ${barbershopId}`);

    if (!subdomain || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'Subdomain and barbershopId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cpanelUser = Deno.env.get('CPANEL_USER');
    const cpanelToken = Deno.env.get('CPANEL_TOKEN');
    const cpanelDomain = Deno.env.get('CPANEL_DOMAIN') || 'barbersmart.app';
    
    if (!cpanelUser || !cpanelToken) {
      console.error('cPanel credentials not configured');
      throw new Error('cPanel credentials not configured');
    }

    // Normalizar subdomínio (lowercase, sem caracteres especiais)
    const normalizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Criar subdomínio via cPanel UAPI
    // Formato: https://hostname:2083/execute/SubDomain/addsubdomain
    const cpanelHost = cpanelDomain.replace(/^www\./, '');
    const cpanelUrl = `https://${cpanelHost}:2083/execute/SubDomain/addsubdomain`;
    
    const params = new URLSearchParams({
      domain: normalizedSubdomain,
      rootdomain: cpanelDomain,
      dir: `public_html` // Diretório raiz - mesmo app serve todos os subdomínios
    });

    console.log(`Calling cPanel API: ${cpanelUrl}`);

    const response = await fetch(`${cpanelUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `cpanel ${cpanelUser}:${cpanelToken}`
      }
    });

    const result = await response.json();
    console.log('cPanel API response:', JSON.stringify(result));

    // Verificar resposta do cPanel
    if (result.status === 0) {
      const errorMsg = result.errors?.join(', ') || 'Unknown cPanel error';
      
      // Se o subdomínio já existe, não é um erro crítico
      if (errorMsg.toLowerCase().includes('already exists') || 
          errorMsg.toLowerCase().includes('já existe')) {
        console.log('Subdomain already exists, continuing...');
      } else {
        console.error('cPanel error:', errorMsg);
        throw new Error(`cPanel error: ${errorMsg}`);
      }
    }

    // Atualizar status no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('barbershop_domains')
      .update({
        subdomain_status: 'active',
        ssl_status: 'provisioning', // AutoSSL vai gerar automaticamente
        updated_at: new Date().toISOString()
      })
      .eq('barbershop_id', barbershopId);

    if (updateError) {
      console.error('Error updating database:', updateError);
    }

    const fullSubdomain = `${normalizedSubdomain}.${cpanelDomain}`;
    console.log(`Subdomain created successfully: ${fullSubdomain}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        subdomain: fullSubdomain,
        message: 'Subdomínio criado com sucesso. O SSL será provisionado automaticamente em alguns minutos.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating subdomain:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
