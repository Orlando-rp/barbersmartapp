-- =====================================================
-- FIX USER_ROLES RLS POLICIES
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Primeiro, criar função para verificar se usuário é admin de uma barbearia específica
CREATE OR REPLACE FUNCTION public.is_admin_of_barbershop(_user_id uuid, _barbershop_id uuid)
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
      AND barbershop_id = _barbershop_id
      AND role IN ('admin', 'super_admin')
  )
  OR public.is_super_admin(_user_id)
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin_of_barbershop(uuid, uuid) TO authenticated;

-- 2. Remover políticas antigas de user_roles (se existirem)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view barbershop roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar novas políticas

-- Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins podem ver roles da sua barbearia
CREATE POLICY "Admins can view barbershop roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
);

-- Admins podem inserir roles na sua barbearia
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
);

-- Admins podem atualizar roles da sua barbearia
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
)
WITH CHECK (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
);

-- Admins podem deletar roles da sua barbearia
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
);

-- Super admins podem gerenciar todas as roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute esta query para verificar se as políticas foram criadas:
-- SELECT * FROM pg_policies WHERE tablename = 'user_roles';
