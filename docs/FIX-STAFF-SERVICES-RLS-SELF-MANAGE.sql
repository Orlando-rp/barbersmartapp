-- =====================================================
-- FIX: STAFF_SERVICES RLS - permitir barbeiro gerenciar os PRÓPRIOS serviços
-- Execute este SQL no Supabase SQL Editor APÓS FIX-STAFF-RLS-MULTI-UNIT.sql
-- =====================================================

ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (nomes usados nos scripts anteriores)
DROP POLICY IF EXISTS "Users can view staff services from their hierarchy" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can insert staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can update staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Admins can delete staff services" ON public.staff_services;
DROP POLICY IF EXISTS "Staff can insert own services" ON public.staff_services;
DROP POLICY IF EXISTS "Staff can update own services" ON public.staff_services;
DROP POLICY IF EXISTS "Staff can delete own services" ON public.staff_services;

-- SELECT: usuários podem ver serviços dos profissionais da sua hierarquia
CREATE POLICY "Users can view staff services from their hierarchy"
ON public.staff_services
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
  )
);

-- INSERT: profissional pode inserir seus próprios vínculos (self-service)
CREATE POLICY "Staff can insert own services"
ON public.staff_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND s.user_id = auth.uid()
  )
);

-- UPDATE: profissional pode atualizar seus próprios vínculos
CREATE POLICY "Staff can update own services"
ON public.staff_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND s.user_id = auth.uid()
  )
);

-- DELETE: profissional pode remover seus próprios vínculos
CREATE POLICY "Staff can delete own services"
ON public.staff_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND s.user_id = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: admins continuam podendo gerenciar
CREATE POLICY "Admins can insert staff services"
ON public.staff_services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can update staff services"
ON public.staff_services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can delete staff services"
ON public.staff_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = staff_services.staff_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
      AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);
