-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 2)
-- Tabelas de Horários, Marketing, Comunicação e SaaS
-- =====================================================

-- Business Hours (Horário de Funcionamento)
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    is_open BOOLEAN DEFAULT true,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    break_start TEXT,
    break_end TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_barbershop ON public.business_hours(barbershop_id);

-- Blocked Dates (Datas Bloqueadas)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_barbershop ON public.blocked_dates(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON public.blocked_dates(blocked_date);

-- Special Hours (Horários Especiais)
CREATE TABLE IF NOT EXISTS public.special_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    special_date DATE NOT NULL,
    is_open BOOLEAN DEFAULT true,
    open_time TEXT,
    close_time TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, special_date)
);

CREATE INDEX IF NOT EXISTS idx_special_hours_barbershop ON public.special_hours(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_special_hours_date ON public.special_hours(special_date);

-- Coupons (Cupons de Desconto)
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase_value DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_barbershop ON public.coupons(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(barbershop_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(barbershop_id, active);

-- Loyalty Points (Pontos de Fidelidade)
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_barbershop ON public.loyalty_points(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_client ON public.loyalty_points(client_id);

-- Loyalty Transactions (Histórico de Pontos)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_points_id UUID NOT NULL REFERENCES public.loyalty_points(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_loyalty ON public.loyalty_transactions(loyalty_points_id);

-- WhatsApp Config (Configuração)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('meta', 'evolution')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT false,
    health_status TEXT DEFAULT 'unknown',
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_barbershop ON public.whatsapp_config(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_provider ON public.whatsapp_config(provider);

-- WhatsApp Logs (Logs de Mensagens)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    message_type TEXT,
    template_name TEXT,
    status TEXT,
    provider TEXT DEFAULT 'meta',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_barbershop ON public.whatsapp_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON public.whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_provider ON public.whatsapp_logs(provider);

-- WhatsApp Messages (Chat)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    message TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
    sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_by_name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_barbershop ON public.whatsapp_messages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(barbershop_id, phone_number, created_at DESC);

-- Subscription Plans (Planos de Assinatura)
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
    feature_flags JSONB DEFAULT '{
        "whatsapp_notifications": true,
        "whatsapp_chatbot": false,
        "marketing_campaigns": false,
        "marketing_coupons": false,
        "advanced_reports": false,
        "predictive_analytics": false,
        "multi_unit": false,
        "white_label": false,
        "priority_support": false
    }'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions (Assinaturas)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT now(),
    current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 month'),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_barbershop ON public.subscriptions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Usage Metrics (Métricas de Uso)
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_barbershop ON public.usage_metrics(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_month ON public.usage_metrics(month);

-- System Messages (Comunicados)
CREATE TABLE IF NOT EXISTS public.system_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    target_plans TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- System Config (Configurações Globais)
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- System Branding (Branding White-Label)
CREATE TABLE IF NOT EXISTS public.system_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name TEXT NOT NULL DEFAULT 'BarberSmart',
    tagline TEXT DEFAULT 'Gestão Inteligente para Barbearias',
    logo_url TEXT,
    logo_dark_url TEXT,
    logo_icon_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#d4a574',
    secondary_color TEXT DEFAULT '#1a1a2e',
    accent_color TEXT DEFAULT '#c9a86c',
    allow_tenant_customization BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Global Payment Config (Config Global de Pagamento)
CREATE TABLE IF NOT EXISTS public.global_payment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_secret_key TEXT,
    stripe_publishable_key TEXT,
    stripe_webhook_secret TEXT,
    stripe_enabled BOOLEAN DEFAULT false,
    mercadopago_access_token TEXT,
    mercadopago_public_key TEXT,
    mercadopago_webhook_secret TEXT,
    mercadopago_enabled BOOLEAN DEFAULT false,
    default_gateway TEXT DEFAULT 'mercadopago',
    allow_tenant_credentials BOOLEAN DEFAULT true,
    platform_fee_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);