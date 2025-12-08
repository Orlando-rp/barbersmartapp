-- ============================================
-- INSERIR ROLE DE SUPER ADMIN
-- ============================================

-- PASSO 1: Crie um usuário no Supabase Dashboard
-- Vá em: Authentication > Users > Add User
-- Email: superadmin@barbersmart.com (ou seu email)
-- Senha: defina uma senha segura

-- PASSO 2: Copie o UUID do usuário criado
-- Clique no usuário e copie o "User UID"

-- PASSO 3: Execute o comando abaixo substituindo o UUID
-- Substitua 'SEU-UUID-AQUI' pelo UUID real do usuário

INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU-UUID-AQUI', 'super_admin');

-- ============================================
-- EXEMPLO COM UUID REAL:
-- ============================================
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'super_admin');

-- ============================================
-- VERIFICAR SE FOI INSERIDO CORRETAMENTE:
-- ============================================
-- SELECT * FROM public.user_roles WHERE role = 'super_admin';
