-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 6)
-- Políticas RLS para tabelas restantes
-- =====================================================

-- SERVICE_CATEGORIES
CREATE POLICY "service_categories_select" ON public.service_categories
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "service_categories_manage" ON public.service_categories
    FOR ALL TO authenticated
    USING (public.is_admin_of_barbershop(auth.uid(), barbershop_id) OR public.is_super_admin(auth.uid()));

-- SERVICES
CREATE POLICY "services_select_policy" ON public.services
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "services_manage_policy" ON public.services
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- STAFF
CREATE POLICY "staff_select_policy" ON public.staff
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "staff_update_own" ON public.staff
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff_manage_policy" ON public.staff
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- STAFF_UNITS
CREATE POLICY "staff_units_select" ON public.staff_units
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "staff_units_manage" ON public.staff_units
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- STAFF_SERVICES
CREATE POLICY "staff_services_select" ON public.staff_services
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_services_manage" ON public.staff_services
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.staff s 
            WHERE s.id = staff_id 
            AND (s.user_id = auth.uid() OR public.is_admin_of_barbershop(auth.uid(), s.barbershop_id))
        ) OR public.is_super_admin(auth.uid())
    );

-- APPOINTMENTS
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
            AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcionista') OR public.has_role(auth.uid(), 'barbeiro'))
        )
    );

-- TRANSACTIONS
CREATE POLICY "transactions_select_policy" ON public.transactions
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "transactions_manage_policy" ON public.transactions
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- CAMPAIGNS
CREATE POLICY "campaigns_select_policy" ON public.campaigns
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "campaigns_manage_policy" ON public.campaigns
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- BUSINESS_HOURS
CREATE POLICY "business_hours_select" ON public.business_hours
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "business_hours_manage" ON public.business_hours
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- BLOCKED_DATES
CREATE POLICY "blocked_dates_select" ON public.blocked_dates
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "blocked_dates_manage" ON public.blocked_dates
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- SPECIAL_HOURS
CREATE POLICY "special_hours_select" ON public.special_hours
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "special_hours_manage" ON public.special_hours
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- COUPONS
CREATE POLICY "coupons_select" ON public.coupons
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "coupons_manage" ON public.coupons
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- LOYALTY_POINTS
CREATE POLICY "loyalty_points_select" ON public.loyalty_points
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "loyalty_points_manage" ON public.loyalty_points
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- LOYALTY_TRANSACTIONS
CREATE POLICY "loyalty_transactions_select" ON public.loyalty_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.loyalty_points lp 
            WHERE lp.id = loyalty_points_id 
            AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), lp.barbershop_id)
        ) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "loyalty_transactions_manage" ON public.loyalty_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.loyalty_points lp 
            WHERE lp.id = loyalty_points_id 
            AND public.is_admin_of_barbershop(auth.uid(), lp.barbershop_id)
        ) OR public.is_super_admin(auth.uid())
    );

-- WHATSAPP_CONFIG
CREATE POLICY "whatsapp_config_select" ON public.whatsapp_config
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "whatsapp_config_manage" ON public.whatsapp_config
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.is_admin_of_barbershop(auth.uid(), barbershop_id));

-- WHATSAPP_LOGS
CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

-- WHATSAPP_MESSAGES
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
    FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));

CREATE POLICY "whatsapp_messages_manage" ON public.whatsapp_messages
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()) OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id));