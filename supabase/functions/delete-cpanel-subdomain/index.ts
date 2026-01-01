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
    
    console.log(`Deleting subdomain: ${subdomain} for barbershop: ${barbershopId}`);

    if (!subdomain) {
      return new Response(
        JSON.stringify({ error: 'Subdomain is required' }),
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

    // Normalizar subdomínio
    const normalizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Deletar subdomínio via cPanel UAPI
    const cpanelHost = cpanelDomain.replace(/^www\./, '');
    const cpanelUrl = `https://${cpanelHost}:2083/execute/SubDomain/delsubdomain`;
    
    // O formato para deletar é: subdomain.rootdomain
    const fullDomain = `${normalizedSubdomain}.${cpanelDomain}`;
    
    const params = new URLSearchParams({
      domain: fullDomain
    });

    console.log(`Calling cPanel API to delete: ${cpanelUrl}`);

    const response = await fetch(`${cpanelUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `cpanel ${cpanelUser}:${cpanelToken}`
      }
    });

    const result = await response.json();
    console.log('cPanel API response:', JSON.stringify(result));

    if (result.status === 0) {
      const errorMsg = result.errors?.join(', ') || 'Unknown cPanel error';
      
      // Se o subdomínio não existe, não é um erro crítico
      if (!errorMsg.toLowerCase().includes('does not exist') && 
          !errorMsg.toLowerCase().includes('não existe')) {
        console.error('cPanel error:', errorMsg);
        throw new Error(`cPanel error: ${errorMsg}`);
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
          subdomain: null,
          subdomain_status: null,
          ssl_status: null,
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId);

      if (updateError) {
        console.error('Error updating database:', updateError);
      }
    }

    console.log(`Subdomain deleted successfully: ${fullDomain}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subdomínio removido com sucesso.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting subdomain:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
