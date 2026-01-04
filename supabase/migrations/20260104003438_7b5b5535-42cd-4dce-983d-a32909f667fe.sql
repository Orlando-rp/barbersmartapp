-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 7)
-- Políticas RLS para tabelas SaaS e restantes
-- =====================================================

-- SUBSCRIPTION_PLANS
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- SUBSCRIPTIONS
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- USAGE_METRICS
CREATE POLICY "Users can view own metrics" ON public.usage_metrics
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "Super admins can manage metrics" ON public.usage_metrics
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- SYSTEM_MESSAGES
CREATE POLICY "Anyone can view system messages" ON public.system_messages
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Super admins can manage system messages" ON public.system_messages
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- SYSTEM_CONFIG
CREATE POLICY "Super admins can manage system config" ON public.system_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- SYSTEM_BRANDING
CREATE POLICY "Anyone can view branding" ON public.system_branding
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Super admins can manage branding" ON public.system_branding
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- GLOBAL_PAYMENT_CONFIG
CREATE POLICY "Super admin can manage global_payment_config" ON public.global_payment_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read global_payment_config" ON public.global_payment_config
    FOR SELECT TO authenticated
    USING (true);

-- BARBERSHOP_DOMAINS
CREATE POLICY "domains_select" ON public.barbershop_domains
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "domains_manage" ON public.barbershop_domains
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- DOMAIN_LOGS
CREATE POLICY "domain_logs_select" ON public.domain_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "domain_logs_insert" ON public.domain_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- DEPLOY_HISTORY
CREATE POLICY "deploy_history_select" ON public.deploy_history
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "deploy_history_manage" ON public.deploy_history
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- REVIEWS
CREATE POLICY "reviews_select_policy" ON public.reviews
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "reviews_insert_policy" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- WAITLIST
CREATE POLICY "waitlist_select_policy" ON public.waitlist
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "waitlist_manage_policy" ON public.waitlist
    FOR ALL TO authenticated
    USING (
        public.is_super_admin(auth.uid())
        OR (
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
            AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcionista'))
        )
    );

-- AUTH_OTP_CODES
CREATE POLICY "Service role can manage OTP codes" ON public.auth_otp_codes
    FOR ALL USING (true) WITH CHECK (true);

-- PORTFOLIO_PHOTOS
CREATE POLICY "Public can view active portfolio photos" ON public.portfolio_photos
    FOR SELECT USING (active = true);

CREATE POLICY "Barbershop staff can manage their portfolio" ON public.portfolio_photos
    FOR ALL TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- PUBLIC_BOOKING_VISITS
CREATE POLICY "Anyone can register visits" ON public.public_booking_visits
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Barbershop admins can view visits" ON public.public_booking_visits
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- PAYMENT_SETTINGS
CREATE POLICY "payment_settings_select" ON public.payment_settings
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "payment_settings_manage" ON public.payment_settings
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- ROLE_PERMISSIONS
CREATE POLICY "role_permissions_select" ON public.role_permissions
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "role_permissions_manage" ON public.role_permissions
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- AUDIT_LOGS
CREATE POLICY "Super admin can view all audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin can view barbershop audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') AND barbershop_id = public.get_user_barbershop_id(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- UPTIME_LOGS
CREATE POLICY "Super admins can view uptime logs" ON public.uptime_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage uptime logs" ON public.uptime_logs
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- UPTIME_ALERTS
CREATE POLICY "Super admins can view uptime alerts" ON public.uptime_alerts
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage uptime alerts" ON public.uptime_alerts
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- UPTIME_CONFIG
CREATE POLICY "Super admins can manage uptime config" ON public.uptime_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()));