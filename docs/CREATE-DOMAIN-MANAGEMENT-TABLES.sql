-- ============================================
-- DOMAIN MANAGEMENT TABLES
-- For custom domains and subdomains for barbershops
-- ============================================

-- 1. Tabela de domínios das barbearias
CREATE TABLE IF NOT EXISTS public.barbershop_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    
    -- Subdomain (ex: minhabarbearia -> minhabarbearia.barbersmart.app)
    subdomain VARCHAR(63) UNIQUE,
    
    -- Custom domain (ex: minhabarbearia.com.br)
    custom_domain VARCHAR(255) UNIQUE,
    
    -- Domain status
    subdomain_status VARCHAR(20) DEFAULT 'active', -- active, pending, disabled
    custom_domain_status VARCHAR(20) DEFAULT 'pending', -- pending, verifying, active, failed, disabled
    
    -- DNS verification
    dns_verification_token TEXT,
    dns_verified_at TIMESTAMPTZ,
    
    -- SSL status
    ssl_status VARCHAR(20) DEFAULT 'pending', -- pending, provisioning, active, failed
    ssl_provisioned_at TIMESTAMPTZ,
    
    -- Primary domain preference (which one to use as canonical)
    primary_domain_type VARCHAR(20) DEFAULT 'subdomain', -- subdomain, custom
    
    -- Landing page config
    landing_page_enabled BOOLEAN DEFAULT true,
    landing_page_config JSONB DEFAULT '{
        "hero_title": null,
        "hero_subtitle": null,
        "show_services": true,
        "show_team": true,
        "show_reviews": true,
        "show_location": true,
        "theme": "default"
    }'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(barbershop_id)
);

-- 2. Tabela de log de domínios (para auditoria)
CREATE TABLE IF NOT EXISTS public.domain_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- subdomain_created, custom_domain_added, dns_verified, ssl_provisioned, etc
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_barbershop_domains_barbershop ON public.barbershop_domains(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_domains_subdomain ON public.barbershop_domains(subdomain);
CREATE INDEX IF NOT EXISTS idx_barbershop_domains_custom ON public.barbershop_domains(custom_domain);
CREATE INDEX IF NOT EXISTS idx_domain_logs_barbershop ON public.domain_logs(barbershop_id);

-- 4. Habilitar RLS
ALTER TABLE public.barbershop_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - barbershop_domains

-- Usuários podem ver domínios de suas barbearias
CREATE POLICY "Users can view own barbershop domains"
ON public.barbershop_domains FOR SELECT
TO authenticated
USING (
    barbershop_id IN (
        SELECT ub.barbershop_id FROM public.user_barbershops ub WHERE ub.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
);

-- Admins podem inserir domínios para suas barbearias
CREATE POLICY "Admins can insert domains"
ON public.barbershop_domains FOR INSERT
TO authenticated
WITH CHECK (
    (
        barbershop_id IN (
            SELECT ub.barbershop_id 
            FROM public.user_barbershops ub 
            JOIN public.user_roles ur ON ub.user_id = ur.user_id
            WHERE ub.user_id = auth.uid() 
            AND ur.role IN ('super_admin', 'admin')
        )
    )
    OR public.is_super_admin(auth.uid())
);

-- Admins podem atualizar domínios de suas barbearias
CREATE POLICY "Admins can update domains"
ON public.barbershop_domains FOR UPDATE
TO authenticated
USING (
    (
        barbershop_id IN (
            SELECT ub.barbershop_id 
            FROM public.user_barbershops ub 
            JOIN public.user_roles ur ON ub.user_id = ur.user_id
            WHERE ub.user_id = auth.uid() 
            AND ur.role IN ('super_admin', 'admin')
        )
    )
    OR public.is_super_admin(auth.uid())
);

-- Super admins podem deletar domínios
CREATE POLICY "Super admins can delete domains"
ON public.barbershop_domains FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 6. Políticas RLS - domain_logs

CREATE POLICY "Users can view own domain logs"
ON public.domain_logs FOR SELECT
TO authenticated
USING (
    barbershop_id IN (
        SELECT ub.barbershop_id FROM public.user_barbershops ub WHERE ub.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
);

CREATE POLICY "System can insert domain logs"
ON public.domain_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_barbershop_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER barbershop_domains_updated_at
    BEFORE UPDATE ON public.barbershop_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_barbershop_domains_updated_at();

-- 8. Função para validar subdomain
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Deve ter entre 3 e 63 caracteres
    IF LENGTH(subdomain) < 3 OR LENGTH(subdomain) > 63 THEN
        RETURN FALSE;
    END IF;
    
    -- Deve começar e terminar com letra ou número
    IF NOT (subdomain ~ '^[a-z0-9]') OR NOT (subdomain ~ '[a-z0-9]$') THEN
        RETURN FALSE;
    END IF;
    
    -- Só pode conter letras minúsculas, números e hífens
    IF NOT (subdomain ~ '^[a-z0-9-]+$') THEN
        RETURN FALSE;
    END IF;
    
    -- Não pode ter hífens consecutivos
    IF subdomain ~ '--' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 9. Função para verificar disponibilidade de subdomain
CREATE OR REPLACE FUNCTION check_subdomain_availability(subdomain_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reserved_subdomains TEXT[] := ARRAY['www', 'app', 'api', 'admin', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'blog', 'shop', 'store', 'cdn', 'static', 'assets', 'images', 'files', 'download', 'downloads', 'support', 'help', 'docs', 'status', 'test', 'demo', 'staging', 'dev', 'development', 'prod', 'production', 'beta', 'alpha'];
BEGIN
    -- Verificar se é reservado
    IF subdomain_to_check = ANY(reserved_subdomains) THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se já está em uso
    IF EXISTS (SELECT 1 FROM public.barbershop_domains WHERE subdomain = subdomain_to_check) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 10. Função para gerar token de verificação DNS
CREATE OR REPLACE FUNCTION generate_dns_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'lovable_verify_' || encode(gen_random_bytes(16), 'hex');
END;
$$;

-- 11. Permissões
GRANT SELECT ON public.barbershop_domains TO authenticated;
GRANT INSERT, UPDATE ON public.barbershop_domains TO authenticated;
GRANT SELECT, INSERT ON public.domain_logs TO authenticated;
GRANT EXECUTE ON FUNCTION validate_subdomain TO authenticated;
GRANT EXECUTE ON FUNCTION check_subdomain_availability TO authenticated;
GRANT EXECUTE ON FUNCTION generate_dns_verification_token TO authenticated;

-- 12. Comentários
COMMENT ON TABLE public.barbershop_domains IS 'Stores subdomain and custom domain configurations for each barbershop';
COMMENT ON TABLE public.domain_logs IS 'Audit log for domain-related actions';
COMMENT ON COLUMN public.barbershop_domains.subdomain IS 'Subdomain part only (e.g., minhabarbearia for minhabarbearia.barbersmart.app)';
COMMENT ON COLUMN public.barbershop_domains.custom_domain IS 'Full custom domain (e.g., minhabarbearia.com.br)';
