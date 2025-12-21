import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomBranding } from '@/contexts/BrandingContext';

interface TenantBrandingResult {
  branding: CustomBranding | null;
  barbershopName: string | null;
  barbershopId: string | null;
  hasWhiteLabel: boolean;
  loading: boolean;
  detectedDomain: string | null;
}

/**
 * Hook para detectar e buscar branding de tenant pelo domínio atual
 * Funciona mesmo antes do login do usuário
 */
export function useTenantBranding(): TenantBrandingResult {
  const [branding, setBranding] = useState<CustomBranding | null>(null);
  const [barbershopName, setBarbershopName] = useState<string | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [hasWhiteLabel, setHasWhiteLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantBranding = async () => {
      setLoading(true);
      
      try {
        const hostname = window.location.hostname;
        setDetectedDomain(hostname);
        
        // Ignorar localhost e domínios do Lovable
        if (
          hostname === 'localhost' ||
          hostname.includes('lovable.app') ||
          hostname.includes('lovableproject.com')
        ) {
          setLoading(false);
          return;
        }
        
        // Extrair subdomínio se for padrão *.barbersmart.app ou similar
        let domainToCheck = hostname;
        
        // Se for um subdomínio do sistema principal (ex: minhabarbearia.barbersmart.app)
        // extrair apenas o subdomínio
        const mainDomains = ['barbersmart.app', 'barbersmart.com.br'];
        for (const mainDomain of mainDomains) {
          if (hostname.endsWith(`.${mainDomain}`)) {
            domainToCheck = hostname.replace(`.${mainDomain}`, '');
            break;
          }
        }
        
        // Buscar branding pelo domínio usando RPC
        const { data, error } = await supabase.rpc('get_tenant_branding_by_domain', {
          domain_name: domainToCheck
        });
        
        if (error) {
          console.log('Tenant branding not found or error:', error.message);
          setLoading(false);
          return;
        }
        
        if (data && typeof data === 'object') {
          const brandingData = data as Record<string, any>;
          
          // Extrair dados de branding
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
  };
}
