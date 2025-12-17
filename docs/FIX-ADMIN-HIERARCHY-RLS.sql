-- =====================================================
-- FIX: Verificação de Admin por Hierarquia de Barbearia
-- Execute este SQL no Supabase SQL Editor
-- Permite que admins de barbearia gerenciem staff da sua hierarquia
-- =====================================================

-- Nova função: Verifica se usuário é admin em alguma barbearia da hierarquia
CREATE OR REPLACE FUNCTION public.is_admin_of_barbershop_hierarchy(_user_id uuid, _target_barbershop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_root_id uuid;
BEGIN
  -- Super admin tem acesso a tudo
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Encontrar o root (matriz) do barbershop alvo
  SELECT COALESCE(b.parent_id, b.id) INTO target_root_id
  FROM barbershops b
  WHERE b.id = _target_barbershop_id;

  IF target_root_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar se o usuário é admin em alguma barbearia da mesma hierarquia
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN user_barbershops ub ON ub.user_id = ur.user_id
    JOIN barbershops b ON b.id = ub.barbershop_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND COALESCE(b.parent_id, b.id) = target_root_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_of_barbershop_hierarchy(uuid, uuid) TO authenticated;

-- =====================================================
-- Atualizar políticas da tabela STAFF
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

-- INSERT: Admins da hierarquia podem adicionar staff
CREATE POLICY "Admins can insert staff"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- UPDATE: Admins da hierarquia podem atualizar staff (além do próprio staff)
CREATE POLICY "Admins can update staff"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
)
WITH CHECK (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- DELETE: Admins da hierarquia podem deletar staff
CREATE POLICY "Admins can delete staff"
ON public.staff
FOR DELETE
TO authenticated
USING (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- =====================================================
-- Atualizar políticas da tabela STAFF_UNITS
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Admins can update staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Admins can delete staff_units" ON public.staff_units;

CREATE POLICY "Admins can insert staff_units"
ON public.staff_units
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "Admins can update staff_units"
ON public.staff_units
FOR UPDATE
TO authenticated
USING (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
)
WITH CHECK (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

CREATE POLICY "Admins can delete staff_units"
ON public.staff_units
FOR DELETE
TO authenticated
USING (
  public.is_admin_of_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- =====================================================
-- Atualizar políticas da tabela STAFF_SERVICES
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can update staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can delete staff services" ON public.staff_services;

CREATE POLICY "Admins can insert staff services"
ON public.staff_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.is_admin_of_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
);

CREATE POLICY "Admins can update staff services"
ON public.staff_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.is_admin_of_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.is_admin_of_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
);

CREATE POLICY "Admins can delete staff services"
ON public.staff_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_services.staff_id
    AND public.is_admin_of_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
);

-- =====================================================
-- Verificação
-- =====================================================
-- Após executar, teste:
-- 1. Logar como admin da barbearia (não super_admin)
-- 2. Tentar adicionar novo membro da equipe
-- 3. Deve funcionar sem erro 403
