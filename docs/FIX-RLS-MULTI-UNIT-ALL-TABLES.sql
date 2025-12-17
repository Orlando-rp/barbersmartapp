-- ============================================
-- FIX: Políticas RLS Multi-Unidade para TODAS as tabelas
-- Usa user_has_access_to_barbershop_hierarchy para suportar hierarquia
-- ============================================

-- ============================================
-- 1. CLIENTS - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view clients from their barbershop" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Receptionists can manage clients" ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- Novas políticas usando hierarquia
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

-- ============================================
-- 2. SERVICES - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view services from their barbershop" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "services_select_policy" ON public.services;
DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
DROP POLICY IF EXISTS "services_update_policy" ON public.services;
DROP POLICY IF EXISTS "services_delete_policy" ON public.services;

-- Novas políticas usando hierarquia
CREATE POLICY "services_select_policy" ON public.services
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "services_insert_policy" ON public.services
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "services_update_policy" ON public.services
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "services_delete_policy" ON public.services
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 3. APPOINTMENTS - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view appointments from their barbershop" ON public.appointments;
DROP POLICY IF EXISTS "Barbers can manage own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Receptionists can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;

-- Novas políticas usando hierarquia
CREATE POLICY "appointments_select_policy" ON public.appointments
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "appointments_insert_policy" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
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

CREATE POLICY "appointments_update_policy" ON public.appointments
FOR UPDATE TO authenticated
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

CREATE POLICY "appointments_delete_policy" ON public.appointments
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 4. TRANSACTIONS - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view transactions from their barbershop" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Barbers can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Novas políticas usando hierarquia
CREATE POLICY "transactions_select_policy" ON public.transactions
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "transactions_insert_policy" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "transactions_update_policy" ON public.transactions
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "transactions_delete_policy" ON public.transactions
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 5. CAMPAIGNS - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view campaigns from their barbershop" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_select_policy" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert_policy" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_update_policy" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_delete_policy" ON public.campaigns;

-- Novas políticas usando hierarquia
CREATE POLICY "campaigns_select_policy" ON public.campaigns
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "campaigns_insert_policy" ON public.campaigns
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "campaigns_update_policy" ON public.campaigns
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "campaigns_delete_policy" ON public.campaigns
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 6. REVIEWS - Políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "reviews_select_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_policy" ON public.reviews;

-- Novas políticas usando hierarquia
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

CREATE POLICY "reviews_update_policy" ON public.reviews
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "reviews_delete_policy" ON public.reviews
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 7. BUSINESS_HOURS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "business_hours_select_policy" ON public.business_hours;
DROP POLICY IF EXISTS "business_hours_insert_policy" ON public.business_hours;
DROP POLICY IF EXISTS "business_hours_update_policy" ON public.business_hours;
DROP POLICY IF EXISTS "business_hours_delete_policy" ON public.business_hours;

CREATE POLICY "business_hours_select_policy" ON public.business_hours
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "business_hours_manage_policy" ON public.business_hours
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 8. SPECIAL_HOURS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "special_hours_select_policy" ON public.special_hours;
DROP POLICY IF EXISTS "special_hours_manage_policy" ON public.special_hours;

CREATE POLICY "special_hours_select_policy" ON public.special_hours
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "special_hours_manage_policy" ON public.special_hours
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 9. BLOCKED_DATES - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "blocked_dates_select_policy" ON public.blocked_dates;
DROP POLICY IF EXISTS "blocked_dates_manage_policy" ON public.blocked_dates;

CREATE POLICY "blocked_dates_select_policy" ON public.blocked_dates
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "blocked_dates_manage_policy" ON public.blocked_dates
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 10. SERVICE_CATEGORIES - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "service_categories_select_policy" ON public.service_categories;
DROP POLICY IF EXISTS "service_categories_manage_policy" ON public.service_categories;

CREATE POLICY "service_categories_select_policy" ON public.service_categories
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "service_categories_manage_policy" ON public.service_categories
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- 11. WAITLIST - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "waitlist_select_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_manage_policy" ON public.waitlist;

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

-- ============================================
-- 12. COUPONS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_manage_policy" ON public.coupons;

CREATE POLICY "coupons_select_policy" ON public.coupons
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "coupons_manage_policy" ON public.coupons
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
    AND public.has_role(auth.uid(), 'admin')
  )
);

-- ============================================
-- NOTA: Execute este script APÓS FIX-STAFF-RLS-MULTI-UNIT.sql
-- que cria a função user_has_access_to_barbershop_hierarchy
-- ============================================
