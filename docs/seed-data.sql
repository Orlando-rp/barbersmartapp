-- =====================================================
-- SEED DATA FOR BARBERSMART - DADOS DE TESTE
-- Execute este SQL no Supabase SQL Editor APÓS criar as tabelas e RLS
-- =====================================================

-- IMPORTANTE: Ajuste os IDs de usuário conforme necessário
-- Os UUIDs abaixo são exemplos - você precisará substituí-los pelos IDs reais
-- dos usuários criados no auth.users do seu projeto Supabase

-- =====================================================
-- 1. CRIAR BARBEARIA DE TESTE
-- =====================================================

INSERT INTO public.barbershops (id, name, address, phone, email, opening_hours, logo_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Barber Smart Premium',
  'Rua das Flores, 123 - Centro, São Paulo - SP, 01234-567',
  '(11) 98765-4321',
  'contato@barbersmartpremium.com.br',
  jsonb_build_object(
    'segunda', jsonb_build_object('open', '09:00', 'close', '19:00'),
    'terca', jsonb_build_object('open', '09:00', 'close', '19:00'),
    'quarta', jsonb_build_object('open', '09:00', 'close', '19:00'),
    'quinta', jsonb_build_object('open', '09:00', 'close', '19:00'),
    'sexta', jsonb_build_object('open', '09:00', 'close', '20:00'),
    'sabado', jsonb_build_object('open', '09:00', 'close', '18:00'),
    'domingo', jsonb_build_object('open', null, 'close', null)
  ),
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70',
  now(),
  now()
);

-- =====================================================
-- 2. CRIAR USUÁRIOS DE TESTE (auth.users)
-- =====================================================
-- NOTA: Estes usuários devem ser criados manualmente via Supabase Dashboard
-- ou através do signUp da aplicação. Os IDs abaixo são exemplos.
-- 
-- Usuários sugeridos para criar:
-- 1. super@admin.com (senha: Admin123!) - Super Admin
-- 2. admin@barbersmartpremium.com.br (senha: Admin123!) - Admin da Barbearia
-- 3. joao@barbersmartpremium.com.br (senha: Barbeiro123!) - Barbeiro
-- 4. maria@barbersmartpremium.com.br (senha: Barbeiro123!) - Barbeira
-- 5. recep@barbersmartpremium.com.br (senha: Recep123!) - Recepcionista

-- =====================================================
-- 3. CRIAR PERFIS DE USUÁRIOS
-- =====================================================
-- Substitua os UUIDs pelos IDs reais dos usuários criados

-- Super Admin (não associado a nenhuma barbearia)
INSERT INTO public.profiles (id, full_name, phone, avatar_url, barbershop_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Substituir pelo ID real
  'Super Administrador',
  '(11) 99999-9999',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin',
  NULL,
  now(),
  now()
);

-- Admin da Barbearia
INSERT INTO public.profiles (id, full_name, phone, avatar_url, barbershop_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- Substituir pelo ID real
  'Carlos Silva',
  '(11) 98765-4321',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
);

-- Barbeiro 1
INSERT INTO public.profiles (id, full_name, phone, avatar_url, barbershop_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003', -- Substituir pelo ID real
  'João Santos',
  '(11) 98765-1111',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
);

-- Barbeira 2
INSERT INTO public.profiles (id, full_name, phone, avatar_url, barbershop_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000004', -- Substituir pelo ID real
  'Maria Oliveira',
  '(11) 98765-2222',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
);

-- Recepcionista
INSERT INTO public.profiles (id, full_name, phone, avatar_url, barbershop_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000005', -- Substituir pelo ID real
  'Ana Costa',
  '(11) 98765-3333',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
);

-- =====================================================
-- 4. ATRIBUIR ROLES AOS USUÁRIOS
-- =====================================================

-- Super Admin
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Substituir pelo ID real
  'super_admin',
  NULL
);

-- Admin da Barbearia
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '00000000-0000-0000-0000-000000000002', -- Substituir pelo ID real
  'admin',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Barbeiro 1
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '00000000-0000-0000-0000-000000000003', -- Substituir pelo ID real
  'barbeiro',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Barbeira 2
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '00000000-0000-0000-0000-000000000004', -- Substituir pelo ID real
  'barbeiro',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Recepcionista
INSERT INTO public.user_roles (user_id, role, barbershop_id)
VALUES (
  '00000000-0000-0000-0000-000000000005', -- Substituir pelo ID real
  'recepcionista',
  '550e8400-e29b-41d4-a716-446655440001'
);

-- =====================================================
-- 5. CRIAR EQUIPE (STAFF)
-- =====================================================

-- João Santos - Barbeiro
INSERT INTO public.staff (id, barbershop_id, user_id, name, specialty, commission_rate, is_active, schedule, created_at, updated_at)
VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000003', -- Substituir pelo ID real
  'João Santos',
  'Cortes clássicos e degradê',
  0.40, -- 40% de comissão
  true,
  jsonb_build_object(
    'segunda', jsonb_build_array('09:00', '13:00', '14:00', '19:00'),
    'terca', jsonb_build_array('09:00', '13:00', '14:00', '19:00'),
    'quarta', jsonb_build_array('09:00', '13:00', '14:00', '19:00'),
    'quinta', jsonb_build_array('09:00', '13:00', '14:00', '19:00'),
    'sexta', jsonb_build_array('09:00', '13:00', '14:00', '20:00'),
    'sabado', jsonb_build_array('09:00', '18:00')
  ),
  now(),
  now()
);

-- Maria Oliveira - Barbeira
INSERT INTO public.staff (id, barbershop_id, user_id, name, specialty, commission_rate, is_active, schedule, created_at, updated_at)
VALUES (
  '660e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440001',
  '00000000-0000-0000-0000-000000000004', -- Substituir pelo ID real
  'Maria Oliveira',
  'Barbas e tratamentos',
  0.45, -- 45% de comissão
  true,
  jsonb_build_object(
    'segunda', jsonb_build_array('10:00', '14:00', '15:00', '19:00'),
    'terca', jsonb_build_array('10:00', '14:00', '15:00', '19:00'),
    'quarta', jsonb_build_array('10:00', '14:00', '15:00', '19:00'),
    'quinta', jsonb_build_array('10:00', '14:00', '15:00', '19:00'),
    'sexta', jsonb_build_array('10:00', '14:00', '15:00', '20:00'),
    'sabado', jsonb_build_array('10:00', '18:00')
  ),
  now(),
  now()
);

-- =====================================================
-- 6. CRIAR CATÁLOGO DE SERVIÇOS
-- =====================================================

INSERT INTO public.services (id, barbershop_id, name, description, duration, price, category, is_active, created_at, updated_at)
VALUES 
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Corte Simples',
    'Corte de cabelo masculino tradicional',
    30,
    35.00,
    'corte',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Corte + Barba',
    'Corte de cabelo + acabamento de barba',
    45,
    55.00,
    'combo',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Barba Completa',
    'Aparar e modelar barba com navalha',
    30,
    30.00,
    'barba',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440001',
    'Degradê',
    'Corte degradê moderno',
    40,
    45.00,
    'corte',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440001',
    'Corte Infantil',
    'Corte de cabelo para crianças até 12 anos',
    25,
    28.00,
    'corte',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'Sobrancelha',
    'Design e modelagem de sobrancelhas',
    15,
    15.00,
    'outros',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440001',
    'Luzes',
    'Aplicação de luzes no cabelo',
    90,
    120.00,
    'outros',
    true,
    now(),
    now()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    'Pacote Premium',
    'Corte + Barba + Sobrancelha + Hidratação',
    75,
    85.00,
    'combo',
    true,
    now(),
    now()
  );

-- =====================================================
-- 7. CRIAR CLIENTES DE TESTE
-- =====================================================

INSERT INTO public.clients (id, barbershop_id, name, phone, email, birth_date, notes, created_at, updated_at)
VALUES 
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Pedro Henrique',
    '(11) 99876-5432',
    'pedro.henrique@email.com',
    '1990-05-15',
    'Cliente VIP - Prefere João Santos',
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Lucas Fernandes',
    '(11) 99876-5433',
    'lucas.fernandes@email.com',
    '1985-08-22',
    'Alérgico a produtos com fragrância forte',
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'Rafael Souza',
    '(11) 99876-5434',
    'rafael.souza@email.com',
    '1992-03-10',
    'Gosta de estilos modernos',
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440001',
    'Gabriel Costa',
    '(11) 99876-5435',
    'gabriel.costa@email.com',
    '1988-11-30',
    NULL,
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440001',
    'Thiago Lima',
    '(11) 99876-5436',
    'thiago.lima@email.com',
    '1995-07-18',
    'Pagamento preferencial: PIX',
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'Bruno Alves',
    '(11) 99876-5437',
    'bruno.alves@email.com',
    '1987-12-05',
    NULL,
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440001',
    'Fernando Santos',
    '(11) 99876-5438',
    'fernando.santos@email.com',
    '1993-09-25',
    'Prefere horários de manhã',
    now(),
    now()
  ),
  (
    '880e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    'Ricardo Oliveira',
    '(11) 99876-5439',
    'ricardo.oliveira@email.com',
    '1991-04-14',
    NULL,
    now(),
    now()
  );

-- =====================================================
-- 8. CRIAR AGENDAMENTOS DE TESTE
-- =====================================================

-- Agendamentos para hoje e próximos dias
INSERT INTO public.appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_date, start_time, end_time, status, notes, created_at, updated_at)
VALUES 
  -- Hoje
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440002',
    CURRENT_DATE,
    '10:00',
    '10:45',
    'confirmado',
    NULL,
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440003',
    CURRENT_DATE,
    '11:00',
    '11:30',
    'confirmado',
    NULL,
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE,
    '14:00',
    '14:30',
    'pendente',
    NULL,
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440004',
    CURRENT_DATE,
    '15:00',
    '15:40',
    'confirmado',
    NULL,
    now(),
    now()
  ),
  -- Amanhã
  (
    '990e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440008',
    CURRENT_DATE + INTERVAL '1 day',
    '09:00',
    '10:15',
    'pendente',
    'Cliente novo - primeira visita',
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440002',
    CURRENT_DATE + INTERVAL '1 day',
    '10:30',
    '11:15',
    'confirmado',
    NULL,
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    CURRENT_DATE + INTERVAL '1 day',
    '14:00',
    '14:30',
    'pendente',
    NULL,
    now(),
    now()
  ),
  -- Depois de amanhã
  (
    '990e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440004',
    CURRENT_DATE + INTERVAL '2 days',
    '11:00',
    '11:40',
    'confirmado',
    NULL,
    now(),
    now()
  ),
  (
    '990e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440003',
    CURRENT_DATE + INTERVAL '2 days',
    '16:00',
    '16:30',
    'confirmado',
    NULL,
    now(),
    now()
  );

-- =====================================================
-- 9. CRIAR TRANSAÇÕES DE TESTE (HISTÓRICO)
-- =====================================================

-- Transações de agendamentos concluídos (últimos 30 dias)
INSERT INTO public.transactions (id, barbershop_id, appointment_id, staff_id, client_id, amount, payment_method, commission_amount, transaction_type, status, transaction_date, notes, created_at, updated_at)
VALUES 
  (
    'aa0e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    55.00,
    'dinheiro',
    22.00,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '2 days',
    'Corte + Barba',
    now() - INTERVAL '2 days',
    now() - INTERVAL '2 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440002',
    30.00,
    'pix',
    13.50,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '2 days',
    'Barba Completa',
    now() - INTERVAL '2 days',
    now() - INTERVAL '2 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    35.00,
    'cartao_credito',
    14.00,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '5 days',
    'Corte Simples',
    now() - INTERVAL '5 days',
    now() - INTERVAL '5 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440004',
    45.00,
    'pix',
    20.25,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '5 days',
    'Degradê',
    now() - INTERVAL '5 days',
    now() - INTERVAL '5 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440005',
    85.00,
    'cartao_debito',
    34.00,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '7 days',
    'Pacote Premium',
    now() - INTERVAL '7 days',
    now() - INTERVAL '7 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440006',
    28.00,
    'dinheiro',
    12.60,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '10 days',
    'Corte Infantil',
    now() - INTERVAL '10 days',
    now() - INTERVAL '10 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    NULL,
    NULL,
    150.00,
    'dinheiro',
    NULL,
    'despesa',
    'concluida',
    CURRENT_DATE - INTERVAL '15 days',
    'Compra de produtos profissionais',
    now() - INTERVAL '15 days',
    now() - INTERVAL '15 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440001',
    NULL,
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440007',
    55.00,
    'pix',
    22.00,
    'receita',
    'concluida',
    CURRENT_DATE - INTERVAL '20 days',
    'Corte + Barba',
    now() - INTERVAL '20 days',
    now() - INTERVAL '20 days'
  );

-- =====================================================
-- 10. CRIAR CAMPANHA DE MARKETING DE TESTE
-- =====================================================

INSERT INTO public.campaigns (id, barbershop_id, name, description, type, status, start_date, end_date, target_audience, message_template, created_at, updated_at)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  'Promoção Dia dos Pais 2025',
  'Desconto especial de 20% em todos os serviços durante a semana do Dia dos Pais',
  'promocao',
  'ativa',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  jsonb_build_object(
    'age_range', jsonb_build_array(25, 60),
    'last_visit', '30_days'
  ),
  'Olá {nome}! 👔 Dia dos Pais se aproxima e temos uma promoção especial para você! Ganhe 20% de desconto em todos os serviços. Agende já: {link}',
  now(),
  now()
);

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================

-- Para verificar os dados inseridos, execute:
-- SELECT * FROM barbershops;
-- SELECT * FROM profiles;
-- SELECT * FROM user_roles;
-- SELECT * FROM staff;
-- SELECT * FROM services;
-- SELECT * FROM clients;
-- SELECT * FROM appointments;
-- SELECT * FROM transactions;
-- SELECT * FROM campaigns;
