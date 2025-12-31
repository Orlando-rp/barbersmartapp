import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DomainRecord {
  barbershop_id: string;
  subdomain: string | null;
  subdomain_status: string;
  custom_domain: string | null;
  custom_domain_status: string;
  updated_at: string;
  barbershops: {
    name: string;
    updated_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get base URL from request or environment
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get('base_url') || 
      Deno.env.get('SITE_URL') || 
      'https://barbersmart.app';

    console.log(`Generating sitemap for base URL: ${baseUrl}`);

    // Fetch all active domains with their barbershops
    const { data: domains, error } = await supabase
      .from('barbershop_domains')
      .select(`
        barbershop_id,
        subdomain,
        subdomain_status,
        custom_domain,
        custom_domain_status,
        updated_at,
        barbershops!inner (
          name,
          updated_at
        )
      `)
      .or('subdomain_status.eq.active,custom_domain_status.eq.active');

    if (error) {
      console.error('Error fetching domains:', error);
      throw error;
    }

    console.log(`Found ${domains?.length || 0} active domains`);

    // Generate sitemap XML
    const urls: string[] = [];
    const now = new Date().toISOString().split('T')[0];

    // Add static pages
    urls.push(generateUrlEntry(`${baseUrl}/`, now, 'daily', '1.0'));
    urls.push(generateUrlEntry(`${baseUrl}/privacy`, now, 'monthly', '0.3'));
    urls.push(generateUrlEntry(`${baseUrl}/terms`, now, 'monthly', '0.3'));

    // Add barbershop landing pages
    if (domains && domains.length > 0) {
      for (const domain of domains as unknown as DomainRecord[]) {
        const lastMod = domain.updated_at?.split('T')[0] || now;
        
        // Add subdomain URL
        if (domain.subdomain && domain.subdomain_status === 'active') {
          urls.push(generateUrlEntry(
            `${baseUrl}/s/${domain.subdomain}`,
            lastMod,
            'weekly',
            '0.8'
          ));
          
          // Add booking URL
          urls.push(generateUrlEntry(
            `${baseUrl}/agendar/${domain.barbershop_id}`,
            lastMod,
            'weekly',
            '0.7'
          ));
        }

        // Add custom domain URL (if different from subdomain)
        if (domain.custom_domain && domain.custom_domain_status === 'active') {
          urls.push(generateUrlEntry(
            `https://${domain.custom_domain}/`,
            lastMod,
            'weekly',
            '0.9'
          ));
        }
      }
    }

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>`;

    console.log(`Generated sitemap with ${urls.length} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateUrlEntry(
  loc: string, 
  lastmod: string, 
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
  priority: string
): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
