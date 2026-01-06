-- =====================================================
-- INSERIR SUPER ADMIN ROLE
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Inserir role super_admin para o usuário principal
-- User ID: 163c1687-d554-4875-8fc3-be307a22d915

INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES ('163c1687-d554-4875-8fc3-be307a22d915', 'super_admin', NULL);

-- =====================================================
-- VERIFICAR SE FOI INSERIDO CORRETAMENTE:
-- =====================================================
-- SELECT * FROM public.user_roles WHERE role = 'super_admin';
