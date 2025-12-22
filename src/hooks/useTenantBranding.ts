import { useState, useEffect } from 'react';
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

/**
 * Hook to detect and fetch tenant branding by current domain
 * Works even before user login (for white-label login pages)
 * 
 * Supports:
 * - Subdomains: barbearia1.barbersmart.app
 * - Custom domains: minhabarbearia.com.br
 */
export function useTenantBranding(): TenantBrandingResult {
  const [branding, setBranding] = useState<CustomBranding | null>(null);
  const [barbershopName, setBarbershopName] = useState<string | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [hasWhiteLabel, setHasWhiteLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantBranding = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const hostname = getEffectiveHostname();
        setDetectedDomain(hostname);
        
        // Skip tenant detection for ignored domains
        if (isIgnoredDomain(hostname)) {
          setLoading(false);
          return;
        }
        
        // Extract the domain to check against the database
        const domainToCheck = extractDomainToCheck(hostname);
        
        if (!domainToCheck) {
          // Main domain or ignored - no tenant branding
          setLoading(false);
          return;
        }
        
        // Fetch branding via RPC
        const { data, error: rpcError } = await supabase.rpc('get_tenant_branding_by_domain', {
          domain_name: domainToCheck
        });
        
        if (rpcError) {
          console.log('Tenant branding not found or error:', rpcError.message);
          setError(rpcError.message);
          setLoading(false);
          return;
        }
        
        if (data && typeof data === 'object') {
          const brandingData = data as Record<string, any>;
          
          // Extract branding data
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
          
          setBranding(customBranding);
          setBarbershopName(brandingData.barbershop_name || null);
          setBarbershopId(brandingData.barbershop_id || null);
          setHasWhiteLabel(brandingData.has_white_label === true);
        }
      } catch (err) {
        console.error('Error fetching tenant branding:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantBranding();
  }, []);

  return {
    branding,
    barbershopName,
    barbershopId,
    hasWhiteLabel,
    loading,
    detectedDomain,
    error,
  };
}
