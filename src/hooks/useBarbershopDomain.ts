import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MAIN_DOMAINS } from '@/lib/tenantConfig';

export interface BarbershopDomain {
  id: string;
  barbershop_id: string;
  subdomain: string | null;
  custom_domain: string | null;
  subdomain_status: string;
  custom_domain_status: string;
  dns_verification_token: string | null;
  dns_verified_at: string | null;
  ssl_status: string;
  ssl_provisioned_at: string | null;
  primary_domain_type: string;
  landing_page_enabled: boolean;
  landing_page_config: {
    hero_title?: string | null;
    hero_subtitle?: string | null;
    show_services?: boolean;
    show_team?: boolean;
    show_reviews?: boolean;
    show_location?: boolean;
    show_gallery?: boolean;
    theme?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string;
    text_color?: string;
    hero_image_url?: string;
    button_style?: 'rounded' | 'square' | 'pill';
    font_family?: string;
  };
  created_at: string;
  updated_at: string;
}

// Usar o primeiro domínio principal configurado ou fallback
const BASE_DOMAIN = MAIN_DOMAINS[0] || 'barbersmart.app';

export const useBarbershopDomain = () => {
  const { selectedBarbershopId, barbershopId, barbershops } = useAuth();
  const [domain, setDomain] = useState<BarbershopDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Para domínios, usar a matriz (root) quando em modo consolidado
  const effectiveBarbershopId = useMemo(() => {
    // Se há uma barbearia selecionada, usar ela
    if (selectedBarbershopId) {
      return selectedBarbershopId;
    }
    
    // Se está em modo "Todas as Unidades", encontrar a matriz
    if (barbershops.length > 0) {
      // Encontrar a raiz (barbershop sem parent_id)
      const rootBarbershop = barbershops.find(b => !b.parent_id);
      if (rootBarbershop) {
        return rootBarbershop.id;
      }
    }
    
    // Último fallback
    return barbershopId;
  }, [selectedBarbershopId, barbershopId, barbershops]);

  useEffect(() => {
    if (effectiveBarbershopId) {
      fetchDomain();
    } else {
      setDomain(null);
      setLoading(false);
    }
  }, [effectiveBarbershopId]);

  const fetchDomain = async () => {
    if (!effectiveBarbershopId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('barbershop_domains')
        .select('*')
        .eq('barbershop_id', effectiveBarbershopId)
        .maybeSingle();

      if (fetchError) {
        if (!fetchError.message?.includes('does not exist')) {
          console.warn('Erro ao buscar domínio:', fetchError);
          setError(fetchError.message);
        }
        setDomain(null);
        return;
      }

      setDomain(data);
    } catch (err) {
      console.warn('Erro ao carregar domínio:', err);
      setDomain(null);
    } finally {
      setLoading(false);
    }
  };

  const checkSubdomainAvailability = async (subdomain: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('check_subdomain_availability', { subdomain_to_check: subdomain.toLowerCase() });

      if (error) {
        console.error('Erro ao verificar subdomain:', error);
        return false;
      }

      return data === true;
    } catch {
      return false;
    }
  };

  const saveSubdomain = async (subdomain: string): Promise<{ success: boolean; error?: string }> => {
    if (!effectiveBarbershopId) {
      return { success: false, error: 'Barbearia não selecionada' };
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    const isValidFormat = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(normalizedSubdomain);
    if (!isValidFormat) {
      return { success: false, error: 'Formato de subdomínio inválido. Use apenas letras minúsculas, números e hífens.' };
    }

    // Check availability
    const isAvailable = await checkSubdomainAvailability(normalizedSubdomain);
    if (!isAvailable) {
      return { success: false, error: 'Este subdomínio já está em uso ou é reservado.' };
    }

    try {
      // Guardar subdomínio antigo para deletar no cPanel se necessário
      const oldSubdomain = domain?.subdomain;

      if (domain) {
        // Update existing
        const { error } = await supabase
          .from('barbershop_domains')
          .update({
            subdomain: normalizedSubdomain,
            subdomain_status: 'provisioning',
            ssl_status: 'pending',
          })
          .eq('id', domain.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('barbershop_domains')
          .insert({
            barbershop_id: effectiveBarbershopId,
            subdomain: normalizedSubdomain,
            subdomain_status: 'provisioning',
            ssl_status: 'pending',
          });

        if (error) throw error;
      }

      // Deletar subdomínio antigo no cPanel se existir e for diferente
      if (oldSubdomain && oldSubdomain !== normalizedSubdomain) {
        try {
          await supabase.functions.invoke('delete-cpanel-subdomain', {
            body: { subdomain: oldSubdomain, barbershopId: null }
          });
        } catch (err) {
          console.warn('Não foi possível deletar subdomínio antigo no cPanel:', err);
        }
      }

      // Criar subdomínio no cPanel
      try {
        const { data: cpanelResult, error: cpanelError } = await supabase.functions.invoke('create-cpanel-subdomain', {
          body: { subdomain: normalizedSubdomain, barbershopId: effectiveBarbershopId }
        });

        if (cpanelError) {
          console.warn('Erro ao criar subdomínio no cPanel:', cpanelError);
          // Continuar mesmo com erro - rota interna ainda funciona
        } else {
          console.log('Subdomínio criado no cPanel:', cpanelResult);
        }
      } catch (err) {
        console.warn('Erro ao chamar cPanel API:', err);
        // Continuar mesmo com erro - rota interna ainda funciona
      }

      await fetchDomain();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao salvar subdomínio' };
    }
  };

  const saveCustomDomain = async (customDomain: string): Promise<{ success: boolean; error?: string; verificationToken?: string }> => {
    if (!effectiveBarbershopId) {
      return { success: false, error: 'Barbearia não selecionada' };
    }

    const normalizedDomain = customDomain.toLowerCase().trim();

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return { success: false, error: 'Formato de domínio inválido.' };
    }

    try {
      const currentCustomDomain = domain?.custom_domain?.toLowerCase().trim() ?? null;
      const isSameDomain = !!domain && currentCustomDomain === normalizedDomain;

      // IMPORTANT: keep TXT token stable. If the domain is the same and we already have a token,
      // do not regenerate it (otherwise the user would need to update DNS again).
      if (isSameDomain && domain?.dns_verification_token) {
        return { success: true, verificationToken: domain.dns_verification_token };
      }

      // Generate verification token (only when needed)
      const { data: tokenData } = await supabase.rpc('generate_dns_verification_token');
      const verificationToken = tokenData || `lovable_verify_${Date.now()}`;

      if (domain) {
        // Update existing
        const { error } = await supabase
          .from('barbershop_domains')
          .update({
            custom_domain: normalizedDomain,
            custom_domain_status: 'pending',
            dns_verification_token: verificationToken,
            dns_verified_at: null,
            ssl_status: 'pending',
            ssl_provisioned_at: null,
          })
          .eq('id', domain.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('barbershop_domains')
          .insert({
            barbershop_id: effectiveBarbershopId,
            custom_domain: normalizedDomain,
            custom_domain_status: 'pending',
            dns_verification_token: verificationToken,
          });

        if (error) throw error;
      }

      await fetchDomain();
      return { success: true, verificationToken };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao salvar domínio personalizado' };
    }
  };

  const removeCustomDomain = async (): Promise<{ success: boolean; error?: string }> => {
    if (!domain) {
      return { success: false, error: 'Nenhum domínio configurado' };
    }

    try {
      const { error } = await supabase
        .from('barbershop_domains')
        .update({
          custom_domain: null,
          custom_domain_status: 'pending',
          dns_verification_token: null,
          dns_verified_at: null,
          ssl_status: 'pending',
          ssl_provisioned_at: null,
          primary_domain_type: 'subdomain',
        })
        .eq('id', domain.id);

      if (error) throw error;

      await fetchDomain();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao remover domínio' };
    }
  };

  const updateLandingPageConfig = async (config: Partial<BarbershopDomain['landing_page_config']>): Promise<{ success: boolean; error?: string }> => {
    if (!domain) {
      return { success: false, error: 'Configure um subdomínio primeiro' };
    }

    try {
      const newConfig = { ...domain.landing_page_config, ...config };
      
      const { error } = await supabase
        .from('barbershop_domains')
        .update({ landing_page_config: newConfig })
        .eq('id', domain.id);

      if (error) throw error;

      await fetchDomain();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao atualizar configuração' };
    }
  };

  // URL do subdomínio real (quando SSL está ativo)
  const getFullSubdomainUrl = (): string | null => {
    if (!domain?.subdomain) return null;
    // Só retorna URL do subdomínio real se SSL estiver ativo
    if (domain.ssl_status === 'active') {
      return `https://${domain.subdomain}.${BASE_DOMAIN}`;
    }
    return null;
  };

  // URL da rota interna (sempre funciona)
  const getInternalUrl = (): string | null => {
    if (!domain?.subdomain) return null;
    return `https://${BASE_DOMAIN}/s/${domain.subdomain}`;
  };

  const getFullCustomDomainUrl = (): string | null => {
    if (!domain?.custom_domain || domain.custom_domain_status !== 'active') return null;
    return `https://${domain.custom_domain}`;
  };

  const getPrimaryUrl = (): string | null => {
    // Prioridade: domínio customizado ativo > subdomínio real com SSL > rota interna
    if (domain?.custom_domain && domain.custom_domain_status === 'active') {
      return getFullCustomDomainUrl();
    }
    // Se subdomínio tem SSL ativo, usar URL real
    if (domain?.subdomain && domain.ssl_status === 'active') {
      return getFullSubdomainUrl();
    }
    // Fallback para rota interna (sempre funciona)
    return getInternalUrl();
  };

  // Verificar status do SSL no cPanel
  const checkSslStatus = async (): Promise<{ success: boolean; sslActive: boolean; error?: string }> => {
    if (!domain?.subdomain) {
      return { success: false, sslActive: false, error: 'Nenhum subdomínio configurado' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-cpanel-ssl', {
        body: { subdomain: domain.subdomain, barbershopId: effectiveBarbershopId }
      });

      if (error) {
        return { success: false, sslActive: false, error: error.message };
      }

      if (data.sslActive) {
        await fetchDomain(); // Atualizar estado local
      }

      return { success: true, sslActive: data.sslActive };
    } catch (err: any) {
      return { success: false, sslActive: false, error: err.message };
    }
  };

  return {
    domain,
    loading,
    error,
    baseDomain: BASE_DOMAIN,
    checkSubdomainAvailability,
    saveSubdomain,
    saveCustomDomain,
    removeCustomDomain,
    updateLandingPageConfig,
    getFullSubdomainUrl,
    getInternalUrl,
    getFullCustomDomainUrl,
    getPrimaryUrl,
    checkSslStatus,
    refresh: fetchDomain,
  };
};
