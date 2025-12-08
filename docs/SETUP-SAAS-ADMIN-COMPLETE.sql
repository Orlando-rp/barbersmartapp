-- ============================================
-- SETUP COMPLETO DO PORTAL SAAS ADMIN
-- Execute este script no Supabase SQL Editor
-- ============================================

-- PARTE 1: Criar enum e tabela de roles
-- ============================================

-- Criar enum para roles (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'barbeiro', 'recepcionista');
    END IF;
END $$;

-- Criar tabela user_roles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PARTE 2: Funções SECURITY DEFINER
-- ============================================

-- Dropar funções existentes para evitar conflito de assinatura
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT);
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);
DROP FUNCTION IF EXISTS public.is_super_admin(UUID);
DROP FUNCTION IF EXISTS public.get_user_barbershop_id(UUID);
DROP FUNCTION IF EXISTS public.user_belongs_to_barbershop(UUID, UUID);

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Função para verificar super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = 'super_admin'
    )
$$;

-- Função para obter barbershop_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT barbershop_id
    FROM public.profiles
    WHERE id = _user_id
    LIMIT 1
$$;

-- Função para verificar se usuário pertence à barbearia
CREATE OR REPLACE FUNCTION public.user_belongs_to_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin(_user_id) OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = _user_id
          AND barbershop_id = _barbershop_id
    )
$$;

-- Função para verificar se usuário pertence à barbearia
CREATE OR REPLACE FUNCTION public.user_belongs_to_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin(_user_id) OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = _user_id
          AND barbershop_id = _barbershop_id
    )
$$;

-- PARTE 3: Políticas RLS para user_roles
-- ============================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- PARTE 4: Tabelas do Portal SaaS Admin
-- ============================================

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    max_staff INTEGER DEFAULT 5,
    max_clients INTEGER DEFAULT 500,
    max_appointments_month INTEGER DEFAULT 1000,
    features JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Tabela de métricas de uso
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    appointments_count INTEGER DEFAULT 0,
    clients_count INTEGER DEFAULT 0,
    staff_count INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    storage_used_mb DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barbershop_id, month)
);

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Tabela de mensagens do sistema
CREATE TABLE IF NOT EXISTS public.system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    target_plans TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- PARTE 5: Políticas RLS para tabelas SaaS
-- ============================================

-- subscription_plans: todos autenticados podem ver planos ativos
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (active = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- subscriptions: usuários veem suas assinaturas, super_admin vê todas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        barbershop_id = public.get_user_barbershop_id(auth.uid())
    );

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- usage_metrics: usuários veem suas métricas, super_admin vê todas
DROP POLICY IF EXISTS "Users can view own metrics" ON public.usage_metrics;
CREATE POLICY "Users can view own metrics" ON public.usage_metrics
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        barbershop_id = public.get_user_barbershop_id(auth.uid())
    );

DROP POLICY IF EXISTS "Super admins can manage metrics" ON public.usage_metrics;
CREATE POLICY "Super admins can manage metrics" ON public.usage_metrics
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- system_messages: todos veem mensagens publicadas, super_admin gerencia
DROP POLICY IF EXISTS "Anyone can view published messages" ON public.system_messages;
CREATE POLICY "Anyone can view published messages" ON public.system_messages
    FOR SELECT TO authenticated
    USING (
        published_at <= NOW() AND
        (expires_at IS NULL OR expires_at > NOW())
    );

DROP POLICY IF EXISTS "Super admins can manage messages" ON public.system_messages;
CREATE POLICY "Super admins can manage messages" ON public.system_messages
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- PARTE 6: Inserir planos padrão
-- ============================================

INSERT INTO public.subscription_plans (name, slug, description, price, max_staff, max_clients, max_appointments_month, features)
VALUES 
    ('Starter', 'starter', 'Plano inicial para barbearias pequenas', 49.90, 2, 100, 200, 
     '["Agendamento online", "Gestão de clientes", "Relatórios básicos"]'::jsonb),
    ('Professional', 'professional', 'Plano profissional com recursos avançados', 99.90, 5, 500, 1000, 
     '["Agendamento online", "Gestão de clientes", "Relatórios avançados", "Marketing por WhatsApp", "Programa de fidelidade"]'::jsonb),
    ('Premium', 'premium', 'Plano premium para barbearias em crescimento', 199.90, 15, 2000, 5000, 
     '["Agendamento online", "Gestão de clientes", "Relatórios avançados", "Marketing por WhatsApp", "Programa de fidelidade", "Multi-unidade (até 3)", "API de integração"]'::jsonb),
    ('Enterprise', 'enterprise', 'Plano empresarial para redes de barbearias', 499.90, -1, -1, -1, 
     '["Todos os recursos Premium", "Unidades ilimitadas", "Suporte prioritário", "Gerente de conta dedicado", "Customização de marca"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    max_staff = EXCLUDED.max_staff,
    max_clients = EXCLUDED.max_clients,
    max_appointments_month = EXCLUDED.max_appointments_month,
    features = EXCLUDED.features,
    updated_at = NOW();

-- PARTE 7: Índices para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_barbershop ON public.subscriptions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_barbershop ON public.usage_metrics(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_month ON public.usage_metrics(month);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- PARTE 8: Grants de permissão
-- ============================================

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.usage_metrics TO authenticated;
GRANT SELECT ON public.system_messages TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_barbershop TO authenticated;

-- ============================================
-- SETUP CONCLUÍDO!
-- Próximo passo: Criar usuário super_admin
-- Veja o arquivo INSERT-SUPER-ADMIN-ROLE.sql
-- ============================================
