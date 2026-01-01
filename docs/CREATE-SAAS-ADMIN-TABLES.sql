-- ============================================
-- Migração: Portal de Administração SaaS
-- Cria tabelas para planos, assinaturas e uso
-- ============================================

-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    billing_period VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    max_staff INTEGER DEFAULT 5,
    max_clients INTEGER DEFAULT 100,
    max_appointments_month INTEGER DEFAULT 500,
    features JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Assinaturas (vincula barbearia ao plano)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, trial
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(barbershop_id)
);

-- 3. Tabela de Uso (métricas mensais por barbearia)
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- primeiro dia do mês
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

-- 4. Tabela de Mensagens do Sistema (broadcasts)
CREATE TABLE IF NOT EXISTS public.system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info', -- info, warning, alert, update
    target_plans UUID[] DEFAULT '{}', -- vazio = todos os planos
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS - Planos (leitura pública, escrita só super_admin)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 7. Políticas RLS - Assinaturas
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (
    barbershop_id IN (SELECT public.get_user_barbershops(auth.uid()))
    OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 8. Políticas RLS - Uso
CREATE POLICY "Users can view own usage"
ON public.usage_metrics FOR SELECT
TO authenticated
USING (
    barbershop_id IN (SELECT public.get_user_barbershops(auth.uid()))
    OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage usage"
ON public.usage_metrics FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 9. Políticas RLS - Mensagens do Sistema
CREATE POLICY "Users can view published messages"
ON public.system_messages FOR SELECT
TO authenticated
USING (
    published_at IS NOT NULL 
    AND published_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "Super admins can manage messages"
ON public.system_messages FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 10. Inserir planos padrão (com is_bundle=true para exibir na landing page)
INSERT INTO public.subscription_plans (name, slug, description, price, max_staff, max_clients, max_appointments_month, features, active, is_bundle) VALUES
('Starter', 'starter', 'Ideal para barbearias iniciantes', 49.90, 2, 50, 100, '["Agendamento online", "Notificações WhatsApp", "Relatórios básicos"]'::jsonb, true, true),
('Professional', 'professional', 'Para barbearias em crescimento', 99.90, 5, 200, 500, '["Agendamento online", "Notificações WhatsApp", "Relatórios avançados", "Marketing", "Fidelidade"]'::jsonb, true, true),
('Premium', 'premium', 'Recursos completos para redes', 199.90, 15, 500, 2000, '["Agendamento online", "Notificações WhatsApp", "Relatórios avançados", "Marketing", "Fidelidade", "Multi-unidade", "API access", "Suporte prioritário"]'::jsonb, true, true),
('Enterprise', 'enterprise', 'Solução personalizada para grandes redes', 499.90, 999, 9999, 99999, '["Todos os recursos Premium", "Customização", "Integração personalizada", "Gerente de conta dedicado", "SLA garantido"]'::jsonb, true, true)
ON CONFLICT (slug) DO UPDATE SET 
  is_bundle = true,
  active = true;

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_barbershop ON public.subscriptions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_barbershop_month ON public.usage_metrics(barbershop_id, month);

-- 12. Função para calcular métricas de uso
CREATE OR REPLACE FUNCTION public.calculate_usage_metrics(_barbershop_id uuid, _month date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _appointments_count INTEGER;
    _clients_count INTEGER;
    _staff_count INTEGER;
    _revenue DECIMAL(10,2);
    _messages_sent INTEGER;
BEGIN
    -- Agendamentos do mês
    SELECT COUNT(*) INTO _appointments_count
    FROM appointments
    WHERE barbershop_id = _barbershop_id
    AND appointment_date >= _month
    AND appointment_date < _month + INTERVAL '1 month';

    -- Clientes ativos
    SELECT COUNT(*) INTO _clients_count
    FROM clients
    WHERE barbershop_id = _barbershop_id
    AND active = true;

    -- Staff ativo
    SELECT COUNT(*) INTO _staff_count
    FROM staff
    WHERE barbershop_id = _barbershop_id
    AND active = true;

    -- Receita do mês
    SELECT COALESCE(SUM(amount), 0) INTO _revenue
    FROM transactions
    WHERE barbershop_id = _barbershop_id
    AND type = 'receita'
    AND transaction_date >= _month
    AND transaction_date < _month + INTERVAL '1 month';

    -- Mensagens enviadas
    SELECT COUNT(*) INTO _messages_sent
    FROM whatsapp_logs
    WHERE barbershop_id = _barbershop_id
    AND created_at >= _month
    AND created_at < _month + INTERVAL '1 month';

    -- Upsert métricas
    INSERT INTO usage_metrics (barbershop_id, month, appointments_count, clients_count, staff_count, revenue, messages_sent)
    VALUES (_barbershop_id, _month, _appointments_count, _clients_count, _staff_count, _revenue, _messages_sent)
    ON CONFLICT (barbershop_id, month) 
    DO UPDATE SET
        appointments_count = EXCLUDED.appointments_count,
        clients_count = EXCLUDED.clients_count,
        staff_count = EXCLUDED.staff_count,
        revenue = EXCLUDED.revenue,
        messages_sent = EXCLUDED.messages_sent,
        updated_at = NOW();
END;
$$;

-- 13. Permissões
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.usage_metrics TO authenticated;
GRANT SELECT ON public.system_messages TO authenticated;
GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.usage_metrics TO authenticated;
GRANT ALL ON public.system_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_usage_metrics TO authenticated;

-- ============================================
-- Execute no Supabase SQL Editor
-- ============================================
