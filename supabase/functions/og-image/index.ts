import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default colors
const DEFAULT_PRIMARY = '#d4a574';
const DEFAULT_BG = '#1a1a1a';
const DEFAULT_TEXT = '#ffffff';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const barbershopId = url.searchParams.get('id');
    const subdomain = url.searchParams.get('subdomain');

    if (!barbershopId && !subdomain) {
      return new Response('Missing id or subdomain parameter', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let shopId = barbershopId;

    // If subdomain, lookup barbershop
    if (subdomain && !barbershopId) {
      const { data: domainData } = await supabase
        .from('barbershop_domains')
        .select('barbershop_id')
        .or(`subdomain.eq.${subdomain},custom_domain.eq.${subdomain}`)
        .maybeSingle();

      if (!domainData) {
        return generateDefaultImage();
      }
      shopId = domainData.barbershop_id;
    }

    // Fetch barbershop data
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select('name, logo_url, settings, address, city')
      .eq('id', shopId)
      .maybeSingle();

    if (error || !barbershop) {
      console.error('Barbershop not found:', error);
      return generateDefaultImage();
    }

    // Fetch branding colors if available
    const { data: branding } = await supabase
      .from('barbershop_branding')
      .select('primary_color, secondary_color')
      .eq('barbershop_id', shopId)
      .maybeSingle();

    const primaryColor = branding?.primary_color || DEFAULT_PRIMARY;
    const name = barbershop.name || 'Barbearia';
    const tagline = barbershop.settings?.description || 
      `${barbershop.city ? `📍 ${barbershop.city}` : 'Agende seu horário online'}`;
    const logoUrl = barbershop.logo_url;

    // Generate SVG
    const svg = generateOgSvg({
      name,
      tagline: tagline.slice(0, 80),
      primaryColor,
      logoUrl,
    });

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache 24h
      },
    });

  } catch (error) {
    console.error('Error generating OG image:', error);
    return generateDefaultImage();
  }
});

interface OgParams {
  name: string;
  tagline: string;
  primaryColor: string;
  logoUrl?: string | null;
}

function generateOgSvg({ name, tagline, primaryColor, logoUrl }: OgParams): string {
  // Escape XML special characters
  const escapedName = escapeXml(name);
  const escapedTagline = escapeXml(tagline);
  
  // Calculate font size based on name length
  const nameFontSize = name.length > 25 ? 48 : name.length > 15 ? 56 : 64;
  
  // Logo section (if available)
  const logoSection = logoUrl ? `
    <image 
      href="${escapeXml(logoUrl)}" 
      x="540" 
      y="120" 
      width="120" 
      height="120" 
      preserveAspectRatio="xMidYMid meet"
    />
  ` : `
    <circle cx="600" cy="180" r="60" fill="${primaryColor}" opacity="0.2"/>
    <text x="600" y="195" font-family="system-ui, sans-serif" font-size="48" fill="${primaryColor}" text-anchor="middle">✂</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f0f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.4" />
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  
  <!-- Decorative elements -->
  <circle cx="100" cy="100" r="300" fill="${primaryColor}" opacity="0.03"/>
  <circle cx="1100" cy="530" r="250" fill="${primaryColor}" opacity="0.03"/>
  
  <!-- Accent line -->
  <rect x="80" y="300" width="4" height="120" fill="url(#accentGradient)" rx="2"/>
  
  <!-- Logo/Icon area -->
  ${logoSection}
  
  <!-- Main title -->
  <text 
    x="600" 
    y="340" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    font-size="${nameFontSize}" 
    font-weight="700" 
    fill="${DEFAULT_TEXT}" 
    text-anchor="middle"
    filter="url(#glow)"
  >${escapedName}</text>
  
  <!-- Tagline -->
  <text 
    x="600" 
    y="400" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    font-size="24" 
    fill="#999999" 
    text-anchor="middle"
  >${escapedTagline}</text>
  
  <!-- CTA Button -->
  <rect x="450" y="450" width="300" height="56" rx="28" fill="${primaryColor}"/>
  <text 
    x="600" 
    y="486" 
    font-family="system-ui, sans-serif" 
    font-size="20" 
    font-weight="600" 
    fill="#000000" 
    text-anchor="middle"
  >Agende Agora</text>
  
  <!-- Bottom branding -->
  <text 
    x="600" 
    y="590" 
    font-family="system-ui, sans-serif" 
    font-size="14" 
    fill="#666666" 
    text-anchor="middle"
  >Agendamento Online • Sem fila</text>
</svg>`;
}

function generateDefaultImage(): Response {
  const svg = generateOgSvg({
    name: 'Barbearia',
    tagline: 'Agende seu horário online',
    primaryColor: DEFAULT_PRIMARY,
    logoUrl: null,
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
