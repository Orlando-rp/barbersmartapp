-- =====================================================
-- BarberSmart - FULL DATABASE SETUP
-- Script Consolidado de Configuração Completa
-- =====================================================
-- 
-- Este script configura todo o banco de dados do zero.
-- Execute no Supabase SQL Editor.
--
-- Versão: 1.0.0
-- Data: 2026-01-03
-- =====================================================

-- =====================================================
-- SEÇÃO 1: EXTENSÕES
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SEÇÃO 2: ENUMS (Tipos Customizados)
-- =====================================================

-- Enum para roles de usuário
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'barbeiro', 'recepcionista', 'cliente');
    END IF;
END $$;

-- Enum para status de agendamento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE public.appointment_status AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado', 'falta');
    END IF;
END $$;

-- Enum para tipo de transação
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM ('receita', 'despesa');
    END IF;
END $$;

-- Enum para método de pagamento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia');
    END IF;
END $$;

-- Enum para operações de auditoria
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_operation') THEN
        CREATE TYPE public.audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');
    END IF;
END $$;

-- =====================================================
-- SEÇÃO 3: FUNÇÕES UTILITÁRIAS BASE
-- =====================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEÇÃO 4: TABELAS PRINCIPAIS (Core)
-- =====================================================

-- 4.1 Barbershops (Barbearias)
CREATE TABLE IF NOT EXISTS public.barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    parent_id UUID REFERENCES public.barbershops(id) ON DELETE SET NULL,
    custom_branding JSONB DEFAULT NULL,
    email_config JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barbershops_parent_id ON public.barbershops(parent_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON public.barbershops(slug);
CREATE INDEX IF NOT EXISTS idx_barbershops_active ON public.barbershops(active);

-- 4.2 Profiles (Perfis de Usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE SET NULL,
    full_name TEXT,
    preferred_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON public.profiles(barbershop_id);

-- 4.3 User Roles (Roles de Usuários)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role, barbershop_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_barbershop_id ON public.user_roles(barbershop_id);

-- 4.4 User Barbershops (Relacionamento N:N para Multi-Unidade)
CREATE TABLE IF NOT EXISTS public.user_barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, barbershop_id)
);

CREATE INDEX IF NOT EXISTS idx_user_barbershops_user_id ON public.user_barbershops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_barbershops_barbershop_id ON public.user_barbershops(barbershop_id);

-- 4.5 Clients (Clientes)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    address TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    notify_email BOOLEAN DEFAULT true,
    notify_whatsapp BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(barbershop_id, active);

-- 4.6 Client Users (Vinculo Cliente-Usuário para Portal Cliente)
CREATE TABLE IF NOT EXISTS public.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON public.client_users(client_id);

-- 4.7 Service Categories (Categorias de Serviços)
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6b7280',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_barbershop ON public.service_categories(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON public.service_categories(barbershop_id, active);

-- 4.8 Services (Serviços)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 30,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(barbershop_id, active);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);

-- 4.9 Staff (Equipe/Profissionais)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    specialties TEXT[] DEFAULT '{}',
    commission_rate DECIMAL(5,2) DEFAULT 0,
    commission_type TEXT DEFAULT 'percentage',
    fixed_commission DECIMAL(10,2) DEFAULT 0,
    schedule JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_barbershop_id ON public.staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.staff(barbershop_id, active);

-- 4.10 Staff Units (Staff por Unidade - Multi-Unidade)
CREATE TABLE IF NOT EXISTS public.staff_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    schedule JSONB DEFAULT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (staff_id, barbershop_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_units_staff_id ON public.staff_units(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_units_barbershop_id ON public.staff_units(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_units_active ON public.staff_units(active);

-- 4.11 Staff Services (Serviços por Profissional)
CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON public.staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON public.staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_active ON public.staff_services(is_active);

-- 4.12 Appointments (Agendamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration INTEGER,
    status appointment_status DEFAULT 'pendente',
    notes TEXT,
    client_name TEXT,
    client_phone TEXT,
    service_name TEXT,
    service_price DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending',
    payment_method_chosen TEXT,
    payment_id TEXT,
    payment_amount DECIMAL(10,2),
    payment_gateway TEXT DEFAULT 'mercadopago',
    is_recurring BOOLEAN DEFAULT false,
    recurring_group_id UUID,
    reschedule_suggested BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date_staff ON public.appointments(staff_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(barbershop_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON public.appointments(recurring_group_id);

-- 4.13 Transactions (Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT,
    payment_method payment_method,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_barbershop_id ON public.transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment_id ON public.transactions(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON public.transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(barbershop_id, type);

-- 4.14 Campaigns (Marketing)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'rascunho',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_barbershop_id ON public.campaigns(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(barbershop_id, status);

-- =====================================================
-- SEÇÃO 5: TABELAS DE HORÁRIOS E DISPONIBILIDADE
-- =====================================================

-- 5.1 Business Hours (Horário de Funcionamento)
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

-- 5.2 Blocked Dates (Datas Bloqueadas)
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

-- 5.3 Special Hours (Horários Especiais)
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

-- =====================================================
-- SEÇÃO 6: TABELAS DE MARKETING E FIDELIDADE
-- =====================================================

-- 6.1 Coupons (Cupons de Desconto)
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

-- 6.2 Loyalty Points (Pontos de Fidelidade)
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

-- 6.3 Loyalty Transactions (Histórico de Pontos)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_points_id UUID NOT NULL REFERENCES public.loyalty_points(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_loyalty ON public.loyalty_transactions(loyalty_points_id);

-- =====================================================
-- SEÇÃO 7: TABELAS DE COMUNICAÇÃO (WhatsApp)
-- =====================================================

-- 7.1 WhatsApp Config (Configuração)
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

-- 7.2 WhatsApp Logs (Logs de Mensagens)
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

-- 7.3 WhatsApp Messages (Chat)
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

-- =====================================================
-- SEÇÃO 8: TABELAS SAAS ADMIN
-- =====================================================

-- 8.1 Subscription Plans (Planos de Assinatura)
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

-- 8.2 Subscriptions (Assinaturas)
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

-- 8.3 Usage Metrics (Métricas de Uso)
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

-- 8.4 System Messages (Comunicados)
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

-- 8.5 System Config (Configurações Globais)
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8.6 System Branding (Branding White-Label)
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

-- 8.7 Global Payment Config (Config Global de Pagamento)
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

-- =====================================================
-- SEÇÃO 9: TABELAS DE DOMÍNIOS E DEPLOY
-- =====================================================

-- 9.1 Barbershop Domains (Domínios)
CREATE TABLE IF NOT EXISTS public.barbershop_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
    subdomain VARCHAR(63) UNIQUE,
    custom_domain VARCHAR(255) UNIQUE,
    subdomain_status VARCHAR(20) DEFAULT 'active',
    custom_domain_status VARCHAR(20) DEFAULT 'pending',
    dns_verification_token TEXT,
    dns_verified_at TIMESTAMPTZ,
    ssl_status VARCHAR(20) DEFAULT 'pending',
    ssl_provisioned_at TIMESTAMPTZ,
    primary_domain_type VARCHAR(20) DEFAULT 'subdomain',
    landing_page_enabled BOOLEAN DEFAULT true,
    landing_page_config JSONB DEFAULT '{
        "template_id": "modern-minimalist",
        "sections": [],
        "global_styles": {
            "primary_color": "220 70% 50%",
            "secondary_color": "180 60% 40%",
            "accent_color": "45 100% 50%",
            "background_color": "0 0% 100%",
            "text_color": "0 0% 10%",
            "font_heading": "Playfair Display",
            "font_body": "Inter",
            "border_radius": "md"
        },
        "seo": {}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barbershop_domains_barbershop ON public.barbershop_domains(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_domains_subdomain ON public.barbershop_domains(subdomain);
CREATE INDEX IF NOT EXISTS idx_barbershop_domains_custom ON public.barbershop_domains(custom_domain);

-- 9.2 Domain Logs (Logs de Domínio)
CREATE TABLE IF NOT EXISTS public.domain_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_logs_barbershop ON public.domain_logs(barbershop_id);

-- 9.3 Deploy History (Histórico de Deploys)
CREATE TABLE IF NOT EXISTS public.deploy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    deploy_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    details JSONB DEFAULT '{}'::jsonb,
    triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deploy_history_barbershop ON public.deploy_history(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_deploy_history_status ON public.deploy_history(status);

-- =====================================================
-- SEÇÃO 10: TABELAS AUXILIARES
-- =====================================================

-- 10.1 Reviews (Avaliações)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE UNIQUE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_barbershop ON public.reviews(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_staff ON public.reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- 10.2 Waitlist (Lista de Espera)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time_start TIME,
    preferred_time_end TIME,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
    notified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_barbershop ON public.waitlist(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_date ON public.waitlist(preferred_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);

-- 10.3 OTP Codes (Autenticação OTP)
CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.auth_otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.auth_otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_phone_code ON public.auth_otp_codes(phone, code);

-- 10.4 Portfolio Photos (Galeria)
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    title VARCHAR(100),
    description TEXT,
    image_url TEXT NOT NULL,
    category VARCHAR(50),
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_photos_barbershop ON public.portfolio_photos(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_featured ON public.portfolio_photos(is_featured) WHERE is_featured = true;

-- 10.5 Public Booking Visits (Analytics)
CREATE TABLE IF NOT EXISTS public.public_booking_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    visitor_ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    visited_at TIMESTAMPTZ DEFAULT now(),
    converted BOOLEAN DEFAULT false,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_visits_barbershop ON public.public_booking_visits(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_booking_visits_date ON public.public_booking_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_booking_visits_converted ON public.public_booking_visits(barbershop_id, converted);

-- 10.6 Payment Settings (Config de Pagamento por Barbearia)
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE UNIQUE,
    mercadopago_access_token TEXT,
    mercadopago_public_key TEXT,
    allow_online_payment BOOLEAN DEFAULT false,
    allow_pay_at_location BOOLEAN DEFAULT true,
    require_deposit BOOLEAN DEFAULT false,
    deposit_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10.7 Role Permissions (Permissões por Role)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (barbershop_id, role)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_barbershop ON public.role_permissions(barbershop_id);

-- 10.8 Audit Logs (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation audit_operation NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON public.audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_barbershop_id ON public.audit_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 10.9 Uptime Logs (Monitoramento)
CREATE TABLE IF NOT EXISTS public.uptime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uptime_logs_endpoint ON public.uptime_logs(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_status ON public.uptime_logs(status);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked_at ON public.uptime_logs(checked_at DESC);

-- 10.10 Uptime Alerts (Alertas)
CREATE TABLE IF NOT EXISTS public.uptime_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_name TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('email', 'whatsapp')),
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uptime_alerts_endpoint ON public.uptime_alerts(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_uptime_alerts_sent_at ON public.uptime_alerts(sent_at DESC);

-- 10.11 Uptime Config (Config de Monitoramento)
CREATE TABLE IF NOT EXISTS public.uptime_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SEÇÃO 11: FUNÇÕES SECURITY DEFINER (RLS)
-- =====================================================

-- 11.1 Verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
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
          AND role::text = _role
    )
$$;

-- 11.2 Verificar se é super admin
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

-- 11.3 Obter barbershop_id do usuário
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

-- Alias para compatibilidade
CREATE OR REPLACE FUNCTION public.get_user_barbershop(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.get_user_barbershop_id(_user_id)
$$;

-- 11.4 Verificar se usuário pertence à barbearia
CREATE OR REPLACE FUNCTION public.user_belongs_to_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin(_user_id) 
    OR public.get_user_barbershop_id(_user_id) = _barbershop_id
    OR EXISTS (
        SELECT 1 FROM public.user_barbershops
        WHERE user_id = _user_id AND barbershop_id = _barbershop_id
    )
$$;

-- 11.5 Verificar acesso à hierarquia (matriz/unidades)
CREATE OR REPLACE FUNCTION public.user_has_access_to_barbershop_hierarchy(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin(_user_id)
        OR EXISTS (
            SELECT 1 FROM public.user_barbershops ub
            WHERE ub.user_id = _user_id
            AND (
                ub.barbershop_id = _barbershop_id
                OR ub.barbershop_id IN (SELECT parent_id FROM public.barbershops WHERE id = _barbershop_id)
                OR _barbershop_id IN (SELECT id FROM public.barbershops WHERE parent_id = ub.barbershop_id)
            )
        )
        OR public.get_user_barbershop_id(_user_id) = _barbershop_id
        OR EXISTS (
            SELECT 1 FROM public.barbershops b
            WHERE b.id = _barbershop_id
            AND b.parent_id = public.get_user_barbershop_id(_user_id)
        )
$$;

-- 11.6 Verificar se é admin da barbearia
CREATE OR REPLACE FUNCTION public.is_admin_of_barbershop(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_super_admin(_user_id)
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = _user_id
            AND role = 'admin'
            AND (barbershop_id = _barbershop_id OR barbershop_id IS NULL)
        )
$$;

-- 11.7 Obter todas as barbearias do usuário
CREATE OR REPLACE FUNCTION public.get_user_barbershops(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT barbershop_id FROM public.user_barbershops WHERE user_id = _user_id
$$;

-- 11.8 Verificar acesso a barbearia (via user_barbershops)
CREATE OR REPLACE FUNCTION public.user_has_barbershop_access(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_barbershops
        WHERE user_id = _user_id AND barbershop_id = _barbershop_id
    ) OR public.is_super_admin(_user_id)
$$;

-- 11.9 Obter client_id do usuário (Portal Cliente)
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT client_id 
    FROM public.client_users 
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- 11.10 Verificar se usuário é cliente
CREATE OR REPLACE FUNCTION public.is_client(_user_id UUID)
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
        AND role = 'cliente'
    )
$$;

-- 11.11 Obter barbershop_id do cliente
CREATE OR REPLACE FUNCTION public.get_client_barbershop_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT c.barbershop_id 
    FROM public.clients c
    INNER JOIN public.client_users cu ON cu.client_id = c.id
    WHERE cu.user_id = _user_id
    LIMIT 1
$$;

-- 11.12 Verificar se é matriz
CREATE OR REPLACE FUNCTION public.is_headquarters(_barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT parent_id IS NULL
    FROM public.barbershops
    WHERE id = _barbershop_id
$$;

-- 11.13 Contar unidades de uma matriz
CREATE OR REPLACE FUNCTION public.count_units(_headquarters_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.barbershops
    WHERE parent_id = _headquarters_id
$$;

-- =====================================================
-- SEÇÃO 12: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deploy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_booking_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SEÇÃO 13: POLÍTICAS RLS
-- =====================================================

-- ============= PROFILES =============
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view barbershop profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') 
        AND barbershop_id = public.get_user_barbershop_id(auth.uid())
        OR public.is_super_admin(auth.uid())
    );

-- ============= USER_ROLES =============
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============= BARBERSHOPS =============
CREATE POLICY "Super admins can manage all barbershops" ON public.barbershops
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own barbershop" ON public.barbershops
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), id));

CREATE POLICY "Admins can update own barbershop" ON public.barbershops
    FOR UPDATE TO authenticated
    USING (public.is_admin_of_barbershop(auth.uid(), id))
    WITH CHECK (public.is_admin_of_barbershop(auth.uid(), id));

-- ============= CLIENTS =============
CREATE POLICY "clients_select_policy" ON public.clients
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "clients_insert_policy" ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcionista'))
        )
    );

CREATE POLICY "clients_update_policy" ON public.clients
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcionista'))
        )
    );

CREATE POLICY "clients_delete_policy" ON public.clients
    FOR DELETE TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND public.has_role(auth.uid(), 'admin')
        )
    );

-- ============= SERVICES =============
CREATE POLICY "services_select_policy" ON public.services
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "services_manage_policy" ON public.services
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND public.has_role(auth.uid(), 'admin')
        )
    );

-- ============= STAFF =============
CREATE POLICY "staff_select_policy" ON public.staff
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "staff_update_own" ON public.staff
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff_manage_policy" ON public.staff
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND public.has_role(auth.uid(), 'admin')
        )
    );

-- ============= APPOINTMENTS =============
CREATE POLICY "appointments_select_policy" ON public.appointments
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
        OR client_id = public.get_client_id_for_user(auth.uid())
    );

CREATE POLICY "appointments_manage_policy" ON public.appointments
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND (
                public.has_role(auth.uid(), 'admin') 
                OR public.has_role(auth.uid(), 'recepcionista')
                OR public.has_role(auth.uid(), 'barbeiro')
            )
        )
    );

-- ============= TRANSACTIONS =============
CREATE POLICY "transactions_select_policy" ON public.transactions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "transactions_manage_policy" ON public.transactions
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND public.has_role(auth.uid(), 'admin')
        )
    );

-- ============= CAMPAIGNS =============
CREATE POLICY "campaigns_select_policy" ON public.campaigns
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "campaigns_manage_policy" ON public.campaigns
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND public.has_role(auth.uid(), 'admin')
        )
    );

-- ============= SUBSCRIPTION_PLANS =============
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============= SUBSCRIPTIONS =============
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid()) OR
        barbershop_id = public.get_user_barbershop_id(auth.uid())
    );

CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============= SYSTEM_BRANDING =============
CREATE POLICY "Anyone can view branding" ON public.system_branding
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Super admins can manage branding" ON public.system_branding
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============= SYSTEM_CONFIG =============
CREATE POLICY "Super admins can manage system config" ON public.system_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- ============= GLOBAL_PAYMENT_CONFIG =============
CREATE POLICY "Super admin can manage global_payment_config" ON public.global_payment_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read global_payment_config" ON public.global_payment_config
    FOR SELECT TO authenticated
    USING (true);

-- ============= REVIEWS =============
CREATE POLICY "reviews_select_policy" ON public.reviews
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "reviews_insert_policy" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

-- ============= WAITLIST =============
CREATE POLICY "waitlist_select_policy" ON public.waitlist
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    );

CREATE POLICY "waitlist_manage_policy" ON public.waitlist
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcionista'))
        )
    );

-- ============= AUDIT_LOGS =============
CREATE POLICY "Super admin can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin can view barbershop audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin')
        AND barbershop_id = public.get_user_barbershop_id(auth.uid())
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============= PORTFOLIO_PHOTOS =============
CREATE POLICY "Public can view active portfolio photos" ON public.portfolio_photos
    FOR SELECT USING (active = true);

CREATE POLICY "Barbershop staff can manage their portfolio" ON public.portfolio_photos
    FOR ALL TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- ============= PUBLIC_BOOKING_VISITS =============
CREATE POLICY "Anyone can register visits" ON public.public_booking_visits
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Barbershop admins can view visits" ON public.public_booking_visits
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- ============= AUTH_OTP_CODES =============
CREATE POLICY "Service role can manage OTP codes" ON public.auth_otp_codes
    FOR ALL USING (true) WITH CHECK (true);

-- ============= UPTIME (para super admins) =============
CREATE POLICY "Super admins can view uptime logs" ON public.uptime_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view uptime alerts" ON public.uptime_alerts
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage uptime config" ON public.uptime_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- =====================================================
-- SEÇÃO 14: TRIGGERS
-- =====================================================

-- Triggers de updated_at para todas as tabelas
CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_users_updated_at BEFORE UPDATE ON public.client_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_units_updated_at BEFORE UPDATE ON public.staff_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_services_updated_at BEFORE UPDATE ON public.staff_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_special_hours_updated_at BEFORE UPDATE ON public.special_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_metrics_updated_at BEFORE UPDATE ON public.usage_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_branding_updated_at BEFORE UPDATE ON public.system_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_global_payment_config_updated_at BEFORE UPDATE ON public.global_payment_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barbershop_domains_updated_at BEFORE UPDATE ON public.barbershop_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_photos_updated_at BEFORE UPDATE ON public.portfolio_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEÇÃO 15: STORAGE BUCKETS
-- =====================================================

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Portfolio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Service images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('service-images', 'service-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public assets bucket (white-label)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-assets', 'public-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon'])
ON CONFLICT (id) DO NOTHING;

-- Landing images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('landing-images', 'landing-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEÇÃO 16: DADOS INICIAIS (SEED)
-- =====================================================

-- Planos de assinatura padrão
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
    updated_at = now();

-- Branding padrão do sistema
INSERT INTO public.system_branding (system_name, tagline, primary_color, secondary_color, accent_color)
VALUES ('BarberSmart', 'Gestão Inteligente para Barbearias', '#d4a574', '#1a1a2e', '#c9a86c')
ON CONFLICT DO NOTHING;

-- Config de uptime padrão
INSERT INTO public.uptime_config (config_key, config_value, description)
VALUES 
    ('alert_threshold', '2', 'Número de falhas consecutivas antes de alertar'),
    ('cooldown_minutes', '15', 'Minutos entre alertas para o mesmo endpoint'),
    ('check_interval_minutes', '5', 'Intervalo entre verificações em minutos')
ON CONFLICT (config_key) DO NOTHING;

-- Inserir registro padrão de payment config
INSERT INTO public.global_payment_config (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.global_payment_config);

-- =====================================================
-- SEÇÃO 17: GRANTS DE PERMISSÃO
-- =====================================================

-- Funções
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershop TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_barbershop TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_access_to_barbershop_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of_barbershop TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershops TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_barbershop_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_id_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_barbershop_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_headquarters TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_units TO authenticated;

-- Tabelas (SELECT para authenticated)
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.usage_metrics TO authenticated;
GRANT SELECT ON public.system_messages TO authenticated;
GRANT SELECT ON public.system_branding TO authenticated;

-- Tabelas (ALL para authenticated com RLS controlando)
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.barbershops TO authenticated;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.staff TO authenticated;
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.campaigns TO authenticated;
GRANT ALL ON public.business_hours TO authenticated;
GRANT ALL ON public.blocked_dates TO authenticated;
GRANT ALL ON public.special_hours TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.waitlist TO authenticated;
GRANT ALL ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.loyalty_points TO authenticated;
GRANT ALL ON public.service_categories TO authenticated;
GRANT ALL ON public.staff_services TO authenticated;
GRANT ALL ON public.staff_units TO authenticated;
GRANT ALL ON public.user_barbershops TO authenticated;
GRANT ALL ON public.client_users TO authenticated;
GRANT ALL ON public.portfolio_photos TO authenticated;
GRANT ALL ON public.payment_settings TO authenticated;
GRANT ALL ON public.role_permissions TO authenticated;
GRANT ALL ON public.barbershop_domains TO authenticated;
GRANT ALL ON public.domain_logs TO authenticated;
GRANT ALL ON public.system_config TO authenticated;
GRANT ALL ON public.global_payment_config TO authenticated;

-- Anon (para booking público)
GRANT SELECT ON public.portfolio_photos TO anon;
GRANT SELECT ON public.payment_settings TO anon;
GRANT INSERT ON public.public_booking_visits TO anon;
GRANT SELECT ON public.global_payment_config TO anon;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ SETUP COMPLETO DO BANCO DE DADOS BARBERSMART';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 O que foi criado:';
    RAISE NOTICE '   • 40+ tabelas';
    RAISE NOTICE '   • 5 enums';
    RAISE NOTICE '   • 15+ funções security definer';
    RAISE NOTICE '   • 50+ políticas RLS';
    RAISE NOTICE '   • 30+ triggers';
    RAISE NOTICE '   • 5 storage buckets';
    RAISE NOTICE '   • 4 planos de assinatura padrão';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 PRÓXIMO PASSO:';
    RAISE NOTICE '   1. Crie um usuário no Supabase Auth';
    RAISE NOTICE '   2. Execute o INSERT abaixo para torná-lo super_admin:';
    RAISE NOTICE '';
    RAISE NOTICE '   INSERT INTO user_roles (user_id, role) VALUES';
    RAISE NOTICE '   (''SEU-USER-ID-AQUI'', ''super_admin'');';
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
END $$;
