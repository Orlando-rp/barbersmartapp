-- =====================================================
-- BarberSmart - FULL DATABASE SETUP (Parte 4)
-- Funções Security Definer para RLS
-- =====================================================

-- Verificar se usuário tem role (usando text para flexibilidade)
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

-- Verificar se é super admin
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

-- Obter barbershop_id do usuário
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

-- Verificar se usuário pertence à barbearia
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

-- Verificar acesso à hierarquia (matriz/unidades)
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

-- Verificar se é admin da barbearia
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

-- Obter todas as barbearias do usuário
CREATE OR REPLACE FUNCTION public.get_user_barbershops(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT barbershop_id FROM public.user_barbershops WHERE user_id = _user_id
$$;

-- Verificar acesso a barbearia (via user_barbershops)
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

-- Obter client_id do usuário (Portal Cliente)
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

-- Verificar se usuário é cliente
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

-- Obter barbershop_id do cliente
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

-- Verificar se é matriz
CREATE OR REPLACE FUNCTION public.is_headquarters(_barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT parent_id IS NULL
    FROM public.barbershops
    WHERE id = _barbershop_id
$$;

-- Contar unidades de uma matriz
CREATE OR REPLACE FUNCTION public.count_units(_headquarters_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.barbershops
    WHERE parent_id = _headquarters_id
$$;