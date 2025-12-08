-- ============================================
-- Migração: Suporte Multi-Unidade
-- Cria tabela user_barbershops para relacionamento N:N
-- ============================================

-- 1. Criar tabela user_barbershops
CREATE TABLE IF NOT EXISTS public.user_barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, barbershop_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_barbershops ENABLE ROW LEVEL SECURITY;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_barbershops_user_id ON public.user_barbershops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_barbershops_barbershop_id ON public.user_barbershops(barbershop_id);

-- 4. Função para verificar se usuário pertence a uma barbearia
CREATE OR REPLACE FUNCTION public.user_has_barbershop_access(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
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

-- 5. Função para obter todas as barbearias do usuário
CREATE OR REPLACE FUNCTION public.get_user_barbershops(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id FROM public.user_barbershops WHERE user_id = _user_id
$$;

-- 6. Políticas RLS para user_barbershops

-- Usuário pode ver suas próprias associações
CREATE POLICY "Users can view own barbershop associations"
ON public.user_barbershops
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Admin pode gerenciar associações da sua barbearia
CREATE POLICY "Admins can manage barbershop associations"
ON public.user_barbershops
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR
  (public.has_role(auth.uid(), 'admin') AND barbershop_id IN (SELECT public.get_user_barbershops(auth.uid())))
);

-- 7. Migrar dados existentes de profiles.barbershop_id para user_barbershops
INSERT INTO public.user_barbershops (user_id, barbershop_id, is_primary)
SELECT id, barbershop_id, true
FROM public.profiles
WHERE barbershop_id IS NOT NULL
ON CONFLICT (user_id, barbershop_id) DO NOTHING;

-- 8. Garantir permissões
GRANT SELECT ON public.user_barbershops TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_barbershops TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_barbershop_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_barbershops TO authenticated;

-- ============================================
-- NOTA: Execute este script no Supabase SQL Editor
-- A coluna barbershop_id em profiles será mantida para retrocompatibilidade
-- mas o sistema agora usará user_barbershops para multi-unidade
-- ============================================
