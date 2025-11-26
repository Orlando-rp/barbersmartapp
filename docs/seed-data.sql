-- =====================================================
-- SEED DATA FOR BARBERSMART - DADOS DE TESTE
-- Execute este SQL no Supabase SQL Editor APÓS criar as tabelas e RLS
-- =====================================================

-- IMPORTANTE: Ajuste os IDs de usuário conforme necessário
-- Os UUIDs abaixo são exemplos - você precisará substituí-los pelos IDs reais
-- dos usuários criados no auth.users do seu projeto Supabase

-- ==================================================
-- PASSO 1: CRIAR BARBEARIA
-- ==================================================

-- Insere uma barbearia de exemplo
INSERT INTO public.barbershops (id, name, address, phone, email, settings, logo_url, active, created_at, updated_at)
VALUES (
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Barbearia Estilo & Classe',
  'Rua das Barbas, 123 - Centro',
  '(11) 98765-4321',
  'contato@estiloeclasse.com.br',
  '{
    "opening_hours": {
      "segunda": {"abertura": "09:00", "fechamento": "19:00"},
      "terca": {"abertura": "09:00", "fechamento": "19:00"},
      "quarta": {"abertura": "09:00", "fechamento": "19:00"},
      "quinta": {"abertura": "09:00", "fechamento": "19:00"},
      "sexta": {"abertura": "09:00", "fechamento": "20:00"},
      "sabado": {"abertura": "08:00", "fechamento": "17:00"},
      "domingo": {"abertura": null, "fechamento": null}
    }
  }'::jsonb,
  'https://placeholder.svg?height=100&width=100&text=Logo',
  true,
  NOW(),
  NOW()
);

-- ==================================================
-- PASSO 2: CRIAR PERFIS DE USUÁRIOS
-- ==================================================

-- NOTA: Os usuários devem ser criados primeiro no Supabase Auth
-- Substitua os IDs abaixo pelos IDs reais dos usuários criados

-- Super Admin (não vinculado a barbearia)
INSERT INTO public.profiles (id, barbershop_id, full_name, phone, avatar_url, created_at, updated_at)
VALUES (
  '11a2b3c4-d5e6-7890-abcd-ef1234567890', -- ID do usuário super admin
  NULL,
  'Super Administrador',
  '(11) 99999-9999',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin',
  NOW(),
  NOW()
);

-- Admin da Barbearia
INSERT INTO public.profiles (id, barbershop_id, full_name, phone, avatar_url, created_at, updated_at)
VALUES (
  '22b3c4d5-e6f7-8901-bcde-f12345678901', -- ID do usuário admin
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Carlos Silva',
  '(11) 98765-4321',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
  NOW(),
  NOW()
);

-- Barbeiro 1 - Paulo Silva
INSERT INTO public.profiles (id, barbershop_id, full_name, phone, avatar_url, created_at, updated_at)
VALUES (
  '33c4d5e6-f7a8-9012-cdef-123456789012', -- ID do usuário barbeiro 1
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Paulo Silva',
  '(11) 98765-1111',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Paulo',
  NOW(),
  NOW()
);

-- Barbeiro 2 - Ricardo Santos
INSERT INTO public.profiles (id, barbershop_id, full_name, phone, avatar_url, created_at, updated_at)
VALUES (
  '44d5e6f7-a8b9-0123-def1-234567890123', -- ID do usuário barbeiro 2
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Ricardo Santos',
  '(11) 98765-2222',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo',
  NOW(),
  NOW()
);

-- Recepcionista
INSERT INTO public.profiles (id, barbershop_id, full_name, phone, avatar_url, created_at, updated_at)
VALUES (
  '55e6f7a8-b9c0-1234-ef12-345678901234', -- ID do usuário recepcionista
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Ana Costa',
  '(11) 98765-3333',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
  NOW(),
  NOW()
);

-- ==================================================
-- PASSO 3: ATRIBUIR ROLES
-- ==================================================

-- Super Admin
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '11a2b3c4-d5e6-7890-abcd-ef1234567890',
  'super_admin',
  NULL
);

-- Admin da Barbearia
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '22b3c4d5-e6f7-8901-bcde-f12345678901',
  'admin',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Barbeiro 1
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '33c4d5e6-f7a8-9012-cdef-123456789012',
  'barbeiro',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Barbeiro 2
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '44d5e6f7-a8b9-0123-def1-234567890123',
  'barbeiro',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Recepcionista
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '55e6f7a8-b9c0-1234-ef12-345678901234',
  'recepcionista',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- ==================================================
-- PASSO 4: CRIAR EQUIPE (STAFF)
-- ==================================================

-- Paulo Silva - Barbeiro
INSERT INTO public.staff (id, barbershop_id, user_id, specialty, commission_rate, work_schedule, active, created_at, updated_at)
VALUES (
  '11e6f7g8-h9i0-1234-9012-345678901234',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  '33c4d5e6-f7a8-9012-cdef-123456789012',
  'Cortes clássicos e degradê',
  40.00,
  '{
    "segunda": ["09:00", "13:00", "14:00", "19:00"],
    "terca": ["09:00", "13:00", "14:00", "19:00"],
    "quarta": ["09:00", "13:00", "14:00", "19:00"],
    "quinta": ["09:00", "13:00", "14:00", "19:00"],
    "sexta": ["09:00", "13:00", "14:00", "20:00"],
    "sabado": ["08:00", "17:00"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Ricardo Santos - Barbeiro
INSERT INTO public.staff (id, barbershop_id, user_id, specialty, commission_rate, work_schedule, active, created_at, updated_at)
VALUES (
  '22f7g8h9-i0j1-2345-0123-456789012345',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  '44d5e6f7-a8b9-0123-def1-234567890123',
  'Barbas e tratamentos',
  45.00,
  '{
    "segunda": ["10:00", "14:00", "15:00", "19:00"],
    "terca": ["10:00", "14:00", "15:00", "19:00"],
    "quarta": ["10:00", "14:00", "15:00", "19:00"],
    "quinta": ["10:00", "14:00", "15:00", "19:00"],
    "sexta": ["10:00", "14:00", "15:00", "20:00"],
    "sabado": ["10:00", "17:00"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- ==================================================
-- PASSO 5: CRIAR SERVIÇOS
-- ==================================================

INSERT INTO public.services (id, barbershop_id, name, description, category, price, duration, active, created_at, updated_at)
VALUES
  ('11a2b3c4-d5e6-7890-abcd-ef1234567890', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Corte Simples', 'Corte de cabelo tradicional', 'corte', 35.00, 30, true, NOW(), NOW()),
  ('22b3c4d5-e6f7-8901-bcde-f12345678901', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Corte + Barba', 'Corte de cabelo + Barba completa', 'combo', 55.00, 45, true, NOW(), NOW()),
  ('33c4d5e6-f7a8-9012-cdef-123456789012', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Barba Completa', 'Barba com navalha e toalha quente', 'barba', 30.00, 30, true, NOW(), NOW()),
  ('44d5e6f7-a8b9-0123-def1-234567890123', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Design de Sobrancelha', 'Design e aparar sobrancelhas', 'outros', 15.00, 15, true, NOW(), NOW()),
  ('55e6f7a8-b9c0-1234-ef12-345678901234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Hidratação Capilar', 'Tratamento com produtos profissionais', 'tratamento', 45.00, 40, true, NOW(), NOW()),
  ('66f7a8b9-c0d1-2345-f123-456789012345', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Pigmentação de Barba', 'Preenchimento de falhas na barba', 'barba', 80.00, 60, true, NOW(), NOW()),
  ('77a8b9c0-d1e2-3456-1234-567890123456', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Corte Infantil', 'Corte para crianças até 12 anos', 'corte', 25.00, 25, true, NOW(), NOW()),
  ('88b9c0d1-e2f3-4567-2345-678901234567', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Combo Premium', 'Corte + Barba + Sobrancelha + Hidratação', 'combo', 120.00, 90, true, NOW(), NOW());

-- ==================================================
-- PASSO 6: CRIAR CLIENTES DE TESTE
-- ==================================================

INSERT INTO public.clients (id, barbershop_id, name, email, phone, birth_date, address, notes, tags, active, created_at, updated_at)
VALUES
  ('11i0j1k2-l3m4-6789-4567-890123456789', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'João Silva', 'joao.silva@email.com', '(11) 91234-5678', '1990-05-15', 'Rua A, 100', 'Cliente frequente', ARRAY['vip', 'frequente'], true, NOW(), NOW()),
  ('22j1k2l3-m4n5-7890-5678-901234567890', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Pedro Santos', 'pedro.s@email.com', '(11) 92345-6789', '1985-08-22', 'Rua B, 200', NULL, ARRAY['novo'], true, NOW(), NOW()),
  ('33k2l3m4-n5o6-8901-6789-012345678901', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Carlos Oliveira', 'carlos.o@email.com', '(11) 93456-7890', '1992-03-10', 'Rua C, 300', 'Prefere horários pela manhã', ARRAY['regular'], true, NOW(), NOW()),
  ('44l3m4n5-o6p7-9012-7890-123456789012', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Roberto Lima', 'roberto.l@email.com', '(11) 94567-8901', '1988-12-05', 'Rua D, 400', NULL, ARRAY['novo'], true, NOW(), NOW()),
  ('55m4n5o6-p7q8-0123-8901-234567890123', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Fernando Costa', 'fernando.c@email.com', '(11) 95678-9012', '1995-07-18', 'Rua E, 500', 'Alérgico a certos produtos', ARRAY['atencao'], true, NOW(), NOW()),
  ('66n5o6p7-q8r9-1234-9012-345678901234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Marcos Alves', 'marcos.a@email.com', '(11) 96789-0123', '1987-01-30', 'Rua F, 600', 'Cliente há 2 anos', ARRAY['fidelizado'], true, NOW(), NOW()),
  ('77o6p7q8-r9s0-2345-0123-456789012345', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Gabriel Souza', 'gabriel.s@email.com', '(11) 97890-1234', '1993-09-25', 'Rua G, 700', NULL, ARRAY['regular'], true, NOW(), NOW()),
  ('88p7q8r9-s0t1-3456-1234-567890123456', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Henrique Rodrigues', 'henrique.r@email.com', '(11) 98901-2345', '1996-11-20', 'Rua H, 800', 'Gosta de estilos modernos', ARRAY['vip'], true, NOW(), NOW());

-- ==================================================
-- PASSO 7: CRIAR AGENDAMENTOS DE TESTE
-- ==================================================

INSERT INTO public.appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_date, appointment_time, status, notes, client_name, client_phone, service_name, service_price, created_at, updated_at)
VALUES
  -- Agendamentos para hoje
  ('11r9s0t1-u2v3-5678-3456-789012345678', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '11i0j1k2-l3m4-6789-4567-890123456789', '11e6f7g8-h9i0-1234-9012-345678901234', '11a2b3c4-d5e6-7890-abcd-ef1234567890', CURRENT_DATE, '09:00:00', 'confirmado', 'Cliente confirmou via WhatsApp', 'João Silva', '(11) 91234-5678', 'Corte Simples', 35.00, NOW(), NOW()),
  ('22s0t1u2-v3w4-6789-4567-890123456789', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '22j1k2l3-m4n5-7890-5678-901234567890', '22f7g8h9-i0j1-2345-0123-456789012345', '22b3c4d5-e6f7-8901-bcde-f12345678901', CURRENT_DATE, '10:00:00', 'confirmado', NULL, 'Pedro Santos', '(11) 92345-6789', 'Corte + Barba', 55.00, NOW(), NOW()),
  ('33t1u2v3-w4x5-7890-5678-901234567890', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '33k2l3m4-n5o6-8901-6789-012345678901', '11e6f7g8-h9i0-1234-9012-345678901234', '33c4d5e6-f7a8-9012-cdef-123456789012', CURRENT_DATE, '11:00:00', 'confirmado', NULL, 'Carlos Oliveira', '(11) 93456-7890', 'Barba Completa', 30.00, NOW(), NOW()),
  ('44u2v3w4-x5y6-8901-6789-012345678901', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '44l3m4n5-o6p7-9012-7890-123456789012', '22f7g8h9-i0j1-2345-0123-456789012345', '77a8b9c0-d1e2-3456-1234-567890123456', CURRENT_DATE, '14:00:00', 'pendente', NULL, 'Roberto Lima', '(11) 94567-8901', 'Corte Infantil', 25.00, NOW(), NOW()),
  ('55v3w4x5-y6z7-9012-7890-123456789012', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '55m4n5o6-p7q8-0123-8901-234567890123', '11e6f7g8-h9i0-1234-9012-345678901234', '55e6f7a8-b9c0-1234-ef12-345678901234', CURRENT_DATE, '15:00:00', 'confirmado', 'Hidratação especial', 'Fernando Costa', '(11) 95678-9012', 'Hidratação Capilar', 45.00, NOW(), NOW()),
  
  -- Agendamentos futuros
  ('66w4x5y6-z7a8-0123-8901-234567890123', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '66n5o6p7-q8r9-1234-9012-345678901234', '22f7g8h9-i0j1-2345-0123-456789012345', '88b9c0d1-e2f3-4567-2345-678901234567', CURRENT_DATE + INTERVAL '1 day', '10:00:00', 'pendente', NULL, 'Marcos Alves', '(11) 96789-0123', 'Combo Premium', 120.00, NOW(), NOW()),
  ('77x5y6z7-a8b9-1234-9012-345678901234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '77o6p7q8-r9s0-2345-0123-456789012345', '11e6f7g8-h9i0-1234-9012-345678901234', '11a2b3c4-d5e6-7890-abcd-ef1234567890', CURRENT_DATE + INTERVAL '2 days', '14:30:00', 'pendente', NULL, 'Gabriel Souza', '(11) 97890-1234', 'Corte Simples', 35.00, NOW(), NOW()),
  ('88y6z7a8-b9c0-2345-0123-456789012345', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '88p7q8r9-s0t1-3456-1234-567890123456', '22f7g8h9-i0j1-2345-0123-456789012345', '66f7a8b9-c0d1-2345-f123-456789012345', CURRENT_DATE + INTERVAL '3 days', '11:00:00', 'pendente', 'Cliente solicitou barbeiro específico', 'Henrique Rodrigues', '(11) 98901-2345', 'Pigmentação de Barba', 80.00, NOW(), NOW()),
  ('99z7a8b9-c0d1-3456-1234-567890123456', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', '11i0j1k2-l3m4-6789-4567-890123456789', '11e6f7g8-h9i0-1234-9012-345678901234', '44d5e6f7-a8b9-0123-def1-234567890123', CURRENT_DATE + INTERVAL '4 days', '16:00:00', 'pendente', NULL, 'João Silva', '(11) 91234-5678', 'Design de Sobrancelha', 15.00, NOW(), NOW());

-- ==================================================
-- PASSO 8: CRIAR TRANSAÇÕES DE TESTE
-- ==================================================

INSERT INTO public.transactions (id, barbershop_id, appointment_id, staff_id, type, amount, payment_method, commission_amount, description, transaction_date, created_at, updated_at)
VALUES
  -- Receitas de agendamentos concluídos
  ('11i0j1k2-l3m4-4567-3456-789012345678', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '11e6f7g8-h9i0-1234-9012-345678901234', 'receita', 35.00, 'dinheiro', 14.00, 'Corte Simples - João Silva', CURRENT_DATE - INTERVAL '1 day', NOW(), NOW()),
  ('22j1k2l3-m4n5-5678-4567-890123456789', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '22f7g8h9-i0j1-2345-0123-456789012345', 'receita', 55.00, 'cartao', 24.75, 'Corte + Barba - Pedro Santos', CURRENT_DATE - INTERVAL '1 day', NOW(), NOW()),
  ('33k2l3m4-n5o6-6789-5678-901234567890', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '11e6f7g8-h9i0-1234-9012-345678901234', 'receita', 30.00, 'pix', 12.00, 'Barba Completa - Carlos Oliveira', CURRENT_DATE - INTERVAL '2 days', NOW(), NOW()),
  ('44l3m4n5-o6p7-7890-6789-012345678901', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '22f7g8h9-i0j1-2345-0123-456789012345', 'receita', 120.00, 'cartao', 54.00, 'Combo Premium - Marcos Alves', CURRENT_DATE - INTERVAL '3 days', NOW(), NOW()),
  ('55m4n5o6-p7q8-8901-7890-123456789012', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '11e6f7g8-h9i0-1234-9012-345678901234', 'receita', 45.00, 'dinheiro', 18.00, 'Hidratação Capilar - Fernando Costa', CURRENT_DATE - INTERVAL '4 days', NOW(), NOW()),
  ('66n5o6p7-q8r9-9012-8901-234567890123', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, '22f7g8h9-i0j1-2345-0123-456789012345', 'receita', 80.00, 'pix', 36.00, 'Pigmentação de Barba - Gabriel Souza', CURRENT_DATE - INTERVAL '5 days', NOW(), NOW()),
  
  -- Despesas operacionais
  ('77o6p7q8-r9s0-0123-9012-345678901234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, NULL, 'despesa', 350.00, 'dinheiro', 0.00, 'Compra de produtos (shampoo, pomadas, etc)', CURRENT_DATE - INTERVAL '3 days', NOW(), NOW()),
  ('88p7q8r9-s0t1-1234-0123-456789012345', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', NULL, NULL, 'despesa', 850.00, 'pix', 0.00, 'Aluguel do mês', CURRENT_DATE - INTERVAL '5 days', NOW(), NOW());

-- ==================================================
-- PASSO 9: CRIAR CAMPANHAS DE MARKETING DE TESTE
-- ==================================================

INSERT INTO public.campaigns (id, barbershop_id, name, type, status, start_date, end_date, target_audience, message_template, sent_count, created_at, updated_at)
VALUES (
  '11a2b3c4-d5e6-8901-abcd-ef1234567890',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Promoção Corte + Barba',
  'promocional',
  'ativa',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  '{"tags": ["vip", "frequente"], "inactive_days": 30}'::jsonb,
  'Olá {{nome}}! Aproveite nossa promoção especial: Corte + Barba por apenas R$ 45,00! Válido até {{data_fim}}. Agende já!',
  0,
  NOW(),
  NOW()
);
