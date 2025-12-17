-- =====================================================
-- FIX RLS POLICIES FOR STAFF TABLES (MULTI-UNIT)
-- Execute este SQL no Supabase SQL Editor
-- =====================================================
-- O problema: user_belongs_to_barbershop usa profiles.barbershop_id
-- que aponta para apenas UMA barbearia, mas admins podem ter acesso
-- a múltiplas unidades via user_barbershops.
-- =====================================================

-- =====================================================
-- PASSO 1: CORRIGIR FUNÇÃO user_belongs_to_barbershop
-- =====================================================
-- Esta função agora verifica user_barbershops ao invés de profiles.barbershop_id

CREATE OR REPLACE FUNCTION public.user_belongs_to_barbershop(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 
      FROM public.user_barbershops ub
      WHERE ub.user_id = _user_id
        AND ub.barbershop_id = _barbershop_id
    )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_belongs_to_barbershop(uuid, uuid) TO authenticated;

-- =====================================================
-- PASSO 2: CRIAR FUNÇÃO AUXILIAR PARA HIERARQUIA MULTI-UNIDADE
-- =====================================================
-- Verifica se um barbershop_id pertence à mesma "família" (matriz + unidades)
-- de algum barbershop que o usuário tem acesso

CREATE OR REPLACE FUNCTION public.user_has_access_to_barbershop_hierarchy(_user_id uuid, _target_barbershop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_root_id uuid;
  user_root_ids uuid[];
BEGIN
  -- Super admin tem acesso a tudo
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Encontrar o root (matriz) do barbershop alvo
  SELECT COALESCE(b.parent_id, b.id) INTO target_root_id
  FROM barbershops b
  WHERE b.id = _target_barbershop_id;

  -- Encontrar todos os roots das barbearias do usuário
  SELECT ARRAY_AGG(DISTINCT COALESCE(b.parent_id, b.id))
  INTO user_root_ids
  FROM user_barbershops ub
  JOIN barbershops b ON b.id = ub.barbershop_id
  WHERE ub.user_id = _user_id;

  -- Verificar se o root do alvo está na lista de roots do usuário
  RETURN target_root_id = ANY(user_root_ids);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_has_access_to_barbershop_hierarchy(uuid, uuid) TO authenticated;

-- =====================================================
-- PASSO 3: CORRIGIR POLÍTICAS RLS DA TABELA STAFF
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view barbershop staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own information" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff from their barbershops" ON public.staff;
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

-- Garantir RLS habilitado
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver staff de todas as barbearias da sua hierarquia
CREATE POLICY "Users can view staff from their hierarchy"
ON public.staff
FOR SELECT
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- UPDATE próprio: Staff pode atualizar suas próprias informações
CREATE POLICY "Staff can update own information"
ON public.staff
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- INSERT: Admins podem adicionar staff nas barbearias da sua hierarquia
CREATE POLICY "Admins can insert staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- UPDATE: Admins podem atualizar staff nas barbearias da sua hierarquia
CREATE POLICY "Admins can update staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- DELETE: Admins podem deletar staff nas barbearias da sua hierarquia
CREATE POLICY "Admins can delete staff"
ON public.staff
FOR DELETE
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- =====================================================
-- PASSO 4: CORRIGIR POLÍTICAS RLS DA TABELA STAFF_UNITS
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view staff_units from their barbershops" ON public.staff_units;
DROP POLICY IF EXISTS "Admins can insert staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Admins can update staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Admins can delete staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Staff can update own unit data" ON public.staff_units;

-- Garantir RLS habilitado
ALTER TABLE public.staff_units ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver staff_units de todas as barbearias da sua hierarquia
CREATE POLICY "Users can view staff_units from their hierarchy"
ON public.staff_units
FOR SELECT
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- INSERT: Admins podem adicionar staff_units nas barbearias da sua hierarquia
CREATE POLICY "Admins can insert staff_units"
ON public.staff_units
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- UPDATE para admins
CREATE POLICY "Admins can update staff_units"
ON public.staff_units
FOR UPDATE
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
)
WITH CHECK (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- UPDATE próprio: Staff pode atualizar suas próprias configurações de unidade
CREATE POLICY "Staff can update own unit data"
ON public.staff_units
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_units.staff_id
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_units.staff_id
    AND s.user_id = auth.uid()
  )
);

-- DELETE: Admins podem deletar staff_units nas barbearias da sua hierarquia
CREATE POLICY "Admins can delete staff_units"
ON public.staff_units
FOR DELETE
TO authenticated
USING (
  public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
);

-- =====================================================
-- PASSO 5: CORRIGIR POLÍTICAS RLS DA TABELA STAFF_SERVICES
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view staff services from their barbershop" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can insert staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can update staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can delete staff services" ON public.staff_services;

-- Garantir RLS habilitado
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver staff_services de staff da sua hierarquia
CREATE POLICY "Users can view staff services from their hierarchy"
ON public.staff_services
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
);

-- INSERT: Admins podem adicionar staff_services
CREATE POLICY "Admins can insert staff services"
ON public.staff_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- UPDATE: Admins podem atualizar staff_services
CREATE POLICY "Admins can update staff services"
ON public.staff_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_super_admin(auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- DELETE: Admins podem deletar staff_services
CREATE POLICY "Admins can delete staff services"
ON public.staff_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- =====================================================
-- PASSO 6: VERIFICAÇÃO
-- =====================================================
-- Execute estas queries para verificar se as políticas foram criadas:

-- SELECT * FROM pg_policies WHERE tablename = 'staff';
-- SELECT * FROM pg_policies WHERE tablename = 'staff_units';
-- SELECT * FROM pg_policies WHERE tablename = 'staff_services';

-- Testar a função de hierarquia:
-- SELECT public.user_has_access_to_barbershop_hierarchy(auth.uid(), 'BARBERSHOP_ID_AQUI');
