-- =====================================================
-- INSERIR ROLES DE USUÁRIOS
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Desabilita temporariamente RLS para inserção inicial
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Limpa dados existentes (se houver)
DELETE FROM public.user_roles;

-- Insere as roles dos usuários
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES 
  -- Super Admin (não vinculado a barbearia)
  ('38348d56-4000-4a83-852a-b37dbda2be20', 'super_admin', NULL),
  
  -- Admin da Barbearia
  ('3609c84d-ece0-4cf9-929d-d9a097f78f2d', 'admin', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890'),
  
  -- Barbeiro 1 (Paulo)
  ('0626954e-32c4-4258-82b6-dfca351e9734', 'barbeiro', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890'),
  
  -- Barbeiro 2 (Ricardo)
  ('5a297b0a-a329-41e0-aea4-1d2e7f1dc211', 'barbeiro', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890'),
  
  -- Recepcionista (Ana)
  ('50120abc-d3c7-4618-a64f-851ea82bb2e4', 'recepcionista', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890');

-- Reabilita RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Verifica os dados inseridos
SELECT 
  ur.user_id,
  p.full_name,
  ur.role,
  ur.barbershop_id
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.role;
