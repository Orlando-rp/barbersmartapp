-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 3)
-- Tabelas de Domínios, Deploy e Auxiliares
-- =====================================================

-- Barbershop Domains (Domínios)
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

-- Domain Logs (Logs de Domínio)
CREATE TABLE IF NOT EXISTS public.domain_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_logs_barbershop ON public.domain_logs(barbershop_id);

-- Deploy History (Histórico de Deploys)
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

-- Reviews (Avaliações)
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

-- Waitlist (Lista de Espera)
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

-- OTP Codes (Autenticação OTP)
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

-- Portfolio Photos (Galeria)
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

-- Public Booking Visits (Analytics)
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

-- Payment Settings (Config de Pagamento por Barbearia)
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

-- Role Permissions (Permissões por Role)
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

-- Audit Logs (Logs de Auditoria)
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_barbershop ON public.audit_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Uptime Logs
CREATE TABLE IF NOT EXISTS public.uptime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    is_healthy BOOLEAN DEFAULT true,
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uptime_logs_endpoint ON public.uptime_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked ON public.uptime_logs(checked_at DESC);

-- Uptime Alerts
CREATE TABLE IF NOT EXISTS public.uptime_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    message TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uptime_alerts_endpoint ON public.uptime_alerts(endpoint);
CREATE INDEX IF NOT EXISTS idx_uptime_alerts_resolved ON public.uptime_alerts(resolved);

-- Uptime Config
CREATE TABLE IF NOT EXISTS public.uptime_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);