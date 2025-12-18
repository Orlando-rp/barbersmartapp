import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DnsResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
}

async function queryDns(domain: string, type: string): Promise<DnsResponse | null> {
  try {
    // Use Google's DNS-over-HTTPS API
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`;
    console.log(`Querying DNS: ${url}`);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' }
    });
    
    if (!response.ok) {
      console.error(`DNS query failed: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`DNS query error for ${domain} (${type}):`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, verificationToken, barbershopId } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying DNS for domain: ${domain}`);
    
    const results = {
      domain,
      aRecord: { configured: false, value: null as string | null, expected: '185.158.133.1' },
      txtRecord: { configured: false, value: null as string | null, expected: verificationToken },
      wwwRecord: { configured: false, value: null as string | null, expected: '185.158.133.1' },
      overallStatus: 'pending' as 'pending' | 'partial' | 'verified' | 'failed'
    };

    // Check A record for root domain
    const aResponse = await queryDns(domain, 'A');
    if (aResponse?.Answer) {
      const aRecords = aResponse.Answer.filter(r => r.type === 1);
      results.aRecord.value = aRecords.map(r => r.data).join(', ');
      results.aRecord.configured = aRecords.some(r => r.data === results.aRecord.expected);
      console.log(`A record: ${results.aRecord.value}, configured: ${results.aRecord.configured}`);
    }

    // Check A record for www subdomain
    const wwwResponse = await queryDns(`www.${domain}`, 'A');
    if (wwwResponse?.Answer) {
      const wwwRecords = wwwResponse.Answer.filter(r => r.type === 1);
      results.wwwRecord.value = wwwRecords.map(r => r.data).join(', ');
      results.wwwRecord.configured = wwwRecords.some(r => r.data === results.wwwRecord.expected);
      console.log(`WWW record: ${results.wwwRecord.value}, configured: ${results.wwwRecord.configured}`);
    }

    // Check TXT record for verification
    if (verificationToken) {
      const txtResponse = await queryDns(`_lovable.${domain}`, 'TXT');
      if (txtResponse?.Answer) {
        const txtRecords = txtResponse.Answer.filter(r => r.type === 16);
        // TXT records come with quotes, remove them
        const txtValues = txtRecords.map(r => r.data.replace(/"/g, ''));
        results.txtRecord.value = txtValues.join(', ');
        results.txtRecord.configured = txtValues.some(v => v === verificationToken);
        console.log(`TXT record: ${results.txtRecord.value}, configured: ${results.txtRecord.configured}`);
      }
    }

    // Determine overall status
    const hasARecord = results.aRecord.configured;
    const hasTxtRecord = results.txtRecord.configured;
    const hasWwwRecord = results.wwwRecord.configured;

    if (hasARecord && hasTxtRecord) {
      results.overallStatus = 'verified';
    } else if (hasARecord || hasTxtRecord || hasWwwRecord) {
      results.overallStatus = 'partial';
    } else {
      results.overallStatus = 'pending';
    }

    // Update database if barbershopId provided and DNS is verified
    if (barbershopId && results.overallStatus === 'verified') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('barbershop_domains')
        .update({
          dns_verified_at: new Date().toISOString(),
          custom_domain_status: 'setting_up',
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId);

      if (updateError) {
        console.error('Error updating domain status:', updateError);
      } else {
        console.log(`Updated domain status for barbershop ${barbershopId}`);
      }
    }

    console.log(`DNS verification complete for ${domain}:`, results.overallStatus);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-dns function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
