import { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  extractDomainToCheck, 
  getEffectiveHostname, 
  isIgnoredDomain,
  isMainDomain 
} from '@/lib/tenantConfig';
import TenantNotFound from '@/pages/TenantNotFound';
import { Skeleton } from '@/components/ui/skeleton';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * SubdomainRouter - Automatic Tenant Detection by Domain
 * 
 * Detects the hostname and redirects to tenant landing page if applicable.
 */
export default function SubdomainRouter({ children }: SubdomainRouterProps) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const detectTenant = async () => {
      try {
        const hostname = getEffectiveHostname();
        
        if (isIgnoredDomain(hostname) || isMainDomain(hostname)) {
          setLoading(false);
          return;
        }
        
        const domainToCheck = extractDomainToCheck(hostname);
        if (!domainToCheck) {
          setLoading(false);
          return;
        }
        
        const { data: domainRecord, error } = await supabase
          .from('barbershop_domains')
          .select('barbershop_id, subdomain, subdomain_status, custom_domain, custom_domain_status')
          .or(`subdomain.eq.${domainToCheck},custom_domain.eq.${domainToCheck}`)
          .maybeSingle();
        
        if (error || !domainRecord) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        // Verificar se é custom domain ativo
        const isCustomDomainActive = domainRecord.custom_domain === domainToCheck && 
          domainRecord.custom_domain_status === 'active';
        
        // Verificar se é subdomain ativo
        const isSubdomainActive = domainRecord.subdomain === domainToCheck && 
          domainRecord.subdomain_status === 'active';
        
        if (!isCustomDomainActive && !isSubdomainActive) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        // Redirecionar para landing page
        if (window.location.pathname === '/') {
          // Para custom domain, usar barbershop_id se não tiver subdomain configurado
          if (isCustomDomainActive && !domainRecord.subdomain) {
            window.location.href = `/b/${domainRecord.barbershop_id}`;
            return;
          }
          // Para subdomain ou custom domain com subdomain, usar rota /s/
          window.location.href = `/s/${domainRecord.subdomain}`;
          return;
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Tenant detection error:', err);
        setNotFound(true);
        setLoading(false);
      }
    };

    detectTenant();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full mt-8" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return <TenantNotFound />;
  }

  return <>{children}</>;
}
