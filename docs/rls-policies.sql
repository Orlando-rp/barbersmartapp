-- =====================================================
-- RLS POLICIES FOR BARBERSMART MULTI-TENANT SYSTEM
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
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

-- Function to get user's barbershop_id
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id(_user_id uuid)
RETURNS uuid
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

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Function to check if user belongs to a barbershop
CREATE OR REPLACE FUNCTION public.user_belongs_to_barbershop(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_barbershop_id(_user_id) = _barbershop_id
    OR public.is_super_admin(_user_id)
$$;


-- 2. PROFILES TABLE POLICIES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins and super admins can view profiles in their barbershop
CREATE POLICY "Admins can view barbershop profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  AND barbershop_id = public.get_user_barbershop_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);


-- 3. USER_ROLES TABLE POLICIES
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can manage all roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Admins can view roles in their barbershop
CREATE POLICY "Admins can view barbershop roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND barbershop_id = public.get_user_barbershop_id(auth.uid())
);


-- 4. BARBERSHOPS TABLE POLICIES
-- =====================================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all barbershops
CREATE POLICY "Super admins can manage all barbershops"
ON public.barbershops
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Users can view their own barbershop
CREATE POLICY "Users can view own barbershop"
ON public.barbershops
FOR SELECT
TO authenticated
USING (id = public.get_user_barbershop_id(auth.uid()));

-- Admins can update their barbershop
CREATE POLICY "Admins can update own barbershop"
ON public.barbershops
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND id = public.get_user_barbershop_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND id = public.get_user_barbershop_id(auth.uid())
);


-- 5. CLIENTS TABLE POLICIES
-- =====================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Users can view clients from their barbershop
CREATE POLICY "Users can view barbershop clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Admins and receptionists can manage clients
CREATE POLICY "Admins and receptionists can manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recepcionista')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recepcionista')
    OR public.is_super_admin(auth.uid())
  )
);


-- 6. SERVICES TABLE POLICIES
-- =====================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view services from their barbershop
CREATE POLICY "Users can view barbershop services"
ON public.services
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Only admins can manage services
CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);


-- 7. STAFF TABLE POLICIES
-- =====================================================

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Users can view staff from their barbershop
CREATE POLICY "Users can view barbershop staff"
ON public.staff
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Staff can update their own information
CREATE POLICY "Staff can update own information"
ON public.staff
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage staff
CREATE POLICY "Admins can manage staff"
ON public.staff
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);


-- 8. APPOINTMENTS TABLE POLICIES
-- =====================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Users can view appointments from their barbershop
CREATE POLICY "Users can view barbershop appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Barbeiros can view and update their own appointments
CREATE POLICY "Barbeiros can manage own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'barbeiro')
  AND staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'barbeiro')
  AND staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- Admins and receptionists can manage all appointments
CREATE POLICY "Admins and receptionists can manage appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recepcionista')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recepcionista')
    OR public.is_super_admin(auth.uid())
  )
);


-- 9. TRANSACTIONS TABLE POLICIES
-- =====================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions from their barbershop
CREATE POLICY "Users can view barbershop transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Barbeiros can view their own transactions
CREATE POLICY "Barbeiros can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'barbeiro')
  AND staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- Admins can manage all transactions
CREATE POLICY "Admins can manage transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);


-- 10. CAMPAIGNS TABLE POLICIES
-- =====================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Users can view campaigns from their barbershop
CREATE POLICY "Users can view barbershop campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
);

-- Admins can manage campaigns
CREATE POLICY "Admins can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_belongs_to_barbershop(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);


-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershop_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_barbershop(uuid, uuid) TO authenticated;

-- Grant usage on sequences (for insert operations)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
