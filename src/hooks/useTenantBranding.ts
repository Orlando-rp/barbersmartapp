import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CustomBranding } from '@/contexts/BrandingContext';
import { 
  extractDomainToCheck, 
  getEffectiveHostname, 
  isIgnoredDomain 
} from '@/lib/tenantConfig';

interface TenantBrandingResult {
  branding: CustomBranding | null;
  barbershopName: string | null;
  barbershopId: string | null;
  hasWhiteLabel: boolean;
  loading: boolean;
  detectedDomain: string | null;
  error: string | null;
}

interface TenantBrandingData {
  branding: CustomBranding | null;
  barbershopName: string | null;
  barbershopId: string | null;
  hasWhiteLabel: boolean;
}

// Função para buscar branding do tenant
async function fetchTenantBrandingByDomain(domainToCheck: string): Promise<TenantBrandingData> {
  const { data, error: rpcError } = await supabase.rpc('get_tenant_branding_by_domain', {
    domain_name: domainToCheck
  });
  
  if (rpcError) {
    console.log('Tenant branding not found or error:', rpcError.message);
    throw new Error(rpcError.message);
  }
  
  if (data && typeof data === 'object') {
    const brandingData = data as Record<string, any>;
    
    const customBranding: CustomBranding = {
      system_name: brandingData.system_name,
      tagline: brandingData.tagline,
      logo_url: brandingData.logo_url,
      logo_light_url: brandingData.logo_light_url,
      logo_dark_url: brandingData.logo_dark_url,
      favicon_url: brandingData.favicon_url,
      primary_color: brandingData.primary_color,
      secondary_color: brandingData.secondary_color,
      accent_color: brandingData.accent_color,
    };
    
    return {
      branding: customBranding,
      barbershopName: brandingData.barbershop_name || null,
      barbershopId: brandingData.barbershop_id || null,
      hasWhiteLabel: brandingData.has_white_label === true,
    };
  }
  
  return {
    branding: null,
    barbershopName: null,
    barbershopId: null,
    hasWhiteLabel: false,
  };
}

/**
 * Hook to detect and fetch tenant branding by current domain
 * Works even before user login (for white-label login pages)
 * Uses React Query for caching (5 min stale, 30 min cache)
 * 
 * Supports:
 * - Subdomains: barbearia1.barbersmart.app
 * - Custom domains: minhabarbearia.com.br
 */
export function useTenantBranding(): TenantBrandingResult {
  const hostname = getEffectiveHostname();
  const isIgnored = isIgnoredDomain(hostname);
  const domainToCheck = isIgnored ? null : extractDomainToCheck(hostname);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-branding', domainToCheck],
    queryFn: () => fetchTenantBrandingByDomain(domainToCheck!),
    enabled: !!domainToCheck,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (antigo cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    branding: data?.branding ?? null,
    barbershopName: data?.barbershopName ?? null,
    barbershopId: data?.barbershopId ?? null,
    hasWhiteLabel: data?.hasWhiteLabel ?? false,
    loading: isLoading,
    detectedDomain: hostname,
    error: error instanceof Error ? error.message : null,
  };
}
