-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 5)
-- Habilitar RLS em todas as tabelas
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
-- POLÍTICAS RLS BÁSICAS
-- =====================================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view barbershop profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') 
        AND barbershop_id = public.get_user_barbershop_id(auth.uid())
        OR public.is_super_admin(auth.uid())
    );

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can manage barbershop roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') 
        AND barbershop_id = public.get_user_barbershop_id(auth.uid())
        AND role != 'super_admin'
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin') 
        AND barbershop_id = public.get_user_barbershop_id(auth.uid())
        AND role != 'super_admin'
    );

-- BARBERSHOPS
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

-- USER_BARBERSHOPS
CREATE POLICY "Users can view own barbershop links" ON public.user_barbershops
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage barbershop links" ON public.user_barbershops
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- CLIENTS
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

-- CLIENT_USERS
CREATE POLICY "client_users_select_policy" ON public.client_users
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "client_users_manage_policy" ON public.client_users
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));