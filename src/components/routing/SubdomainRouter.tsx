import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

interface DomainRecord {
  barbershop_id: string;
  subdomain: string | null;
  subdomain_status: string;
  custom_domain: string | null;
  custom_domain_status: string;
}

// Função para buscar domínio
async function fetchDomainByHostname(domainToCheck: string): Promise<DomainRecord | null> {
  const { data, error } = await supabase
    .from('barbershop_domains')
    .select('barbershop_id, subdomain, subdomain_status, custom_domain, custom_domain_status')
    .or(`subdomain.eq.${domainToCheck},custom_domain.eq.${domainToCheck}`)
    .maybeSingle();
  
  if (error) {
    console.error('Domain query error:', error);
    throw error;
  }
  
  return data;
}

/**
 * SubdomainRouter - Automatic Tenant Detection by Domain
 * Uses React Query for caching (5 min stale, 30 min cache)
 * Detects the hostname and redirects to tenant landing page if applicable.
 */
export default function SubdomainRouter({ children }: SubdomainRouterProps) {
  const hostname = getEffectiveHostname();
  const isIgnored = isIgnoredDomain(hostname);
  const isMain = isMainDomain(hostname);
  const domainToCheck = extractDomainToCheck(hostname);
  
  // Skip query if ignored/main domain or no domain to check
  const shouldQuery = !isIgnored && !isMain && !!domainToCheck;

  const { data: domainRecord, isLoading, isError } = useQuery({
    queryKey: ['domain-record', domainToCheck],
    queryFn: () => fetchDomainByHostname(domainToCheck!),
    enabled: shouldQuery,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Skip tenant detection for ignored/main domains
  if (isIgnored || isMain || !domainToCheck) {
    return <>{children}</>;
  }

  if (isLoading) {
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

  if (isError || !domainRecord) {
    return <TenantNotFound />;
  }

  // Verificar se é custom domain ativo
  const isCustomDomainActive = domainRecord.custom_domain === domainToCheck && 
    domainRecord.custom_domain_status === 'active';
  
  // Verificar se é subdomain ativo
  const isSubdomainActive = domainRecord.subdomain === domainToCheck && 
    domainRecord.subdomain_status === 'active';
  
  if (!isCustomDomainActive && !isSubdomainActive) {
    return <TenantNotFound />;
  }
  
  // Redirecionar para landing page apenas na raiz
  if (window.location.pathname === '/') {
    // Para custom domain, usar barbershop_id se não tiver subdomain configurado
    if (isCustomDomainActive && !domainRecord.subdomain) {
      window.location.href = `/b/${domainRecord.barbershop_id}`;
      return null;
    }
    // Para subdomain ou custom domain com subdomain, usar rota /s/
    window.location.href = `/s/${domainRecord.subdomain}`;
    return null;
  }

  return <>{children}</>;
}
