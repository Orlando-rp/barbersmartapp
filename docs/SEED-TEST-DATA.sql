-- =====================================================
-- SEED DATA DE TESTE - BarberSmart
-- 2 Barbearias com 2 unidades cada
-- =====================================================

-- =====================================================
-- BARBEARIA 1: Alpha (2 unidades)
-- =====================================================

-- Unidade 1 - Alpha Centro
INSERT INTO barbershops (id, name, address, phone, email, settings, active) VALUES
('a1111111-1111-1111-1111-111111111111', 'Barbearia Alpha - Centro', 'Rua das Flores, 100 - Centro', '11999001001', 'centro@alpha.com', 
'{"opening_hours": {"monday": {"open": "09:00", "close": "19:00"}, "tuesday": {"open": "09:00", "close": "19:00"}, "wednesday": {"open": "09:00", "close": "19:00"}, "thursday": {"open": "09:00", "close": "19:00"}, "friday": {"open": "09:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "17:00"}}}', 
true);

-- Unidade 2 - Alpha Shopping
INSERT INTO barbershops (id, name, address, phone, email, settings, active) VALUES
('a2222222-2222-2222-2222-222222222222', 'Barbearia Alpha - Shopping', 'Shopping Central, Loja 45', '11999002002', 'shopping@alpha.com', 
'{"opening_hours": {"monday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "10:00", "close": "22:00"}, "wednesday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "10:00", "close": "22:00"}, "friday": {"open": "10:00", "close": "22:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "sunday": {"open": "14:00", "close": "20:00"}}}', 
true);

-- =====================================================
-- BARBEARIA 2: Beta (2 unidades)
-- =====================================================

-- Unidade 1 - Beta Jardins
INSERT INTO barbershops (id, name, address, phone, email, settings, active) VALUES
('b1111111-1111-1111-1111-111111111111', 'Barbearia Beta - Jardins', 'Av. Paulista, 1500 - Jardins', '11988001001', 'jardins@beta.com', 
'{"opening_hours": {"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "18:00"}}}', 
true);

-- Unidade 2 - Beta Moema
INSERT INTO barbershops (id, name, address, phone, email, settings, active) VALUES
('b2222222-2222-2222-2222-222222222222', 'Barbearia Beta - Moema', 'Rua dos Açores, 200 - Moema', '11988002002', 'moema@beta.com', 
'{"opening_hours": {"monday": {"open": "09:00", "close": "19:00"}, "tuesday": {"open": "09:00", "close": "19:00"}, "wednesday": {"open": "09:00", "close": "19:00"}, "thursday": {"open": "09:00", "close": "19:00"}, "friday": {"open": "09:00", "close": "19:00"}, "saturday": {"open": "09:00", "close": "16:00"}}}', 
true);

-- =====================================================
-- SERVIÇOS - Alpha Centro
-- =====================================================
INSERT INTO services (id, barbershop_id, name, description, price, duration, category, active) VALUES
('0a111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Corte Tradicional', 'Corte clássico masculino', 45.00, 30, 'corte', true),
('0a111111-1111-1111-1111-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Barba Completa', 'Barba com toalha quente', 35.00, 25, 'barba', true),
('0a111111-1111-1111-1111-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Combo Corte + Barba', 'Corte e barba completos', 70.00, 50, 'combo', true);

-- SERVIÇOS - Alpha Shopping
INSERT INTO services (id, barbershop_id, name, description, price, duration, category, active) VALUES
('0a222222-2222-2222-2222-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Corte Moderno', 'Corte com design', 55.00, 35, 'corte', true),
('0a222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Barba Premium', 'Barba com produtos premium', 45.00, 30, 'barba', true),
('0a222222-2222-2222-2222-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Combo VIP', 'Corte, barba e hidratação', 95.00, 60, 'combo', true);

-- SERVIÇOS - Beta Jardins
INSERT INTO services (id, barbershop_id, name, description, price, duration, category, active) VALUES
('0b111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Corte Executive', 'Corte executivo premium', 65.00, 40, 'corte', true),
('0b111111-1111-1111-1111-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Barba Designer', 'Barba com design personalizado', 50.00, 35, 'barba', true),
('0b111111-1111-1111-1111-333333333333', 'b1111111-1111-1111-1111-111111111111', 'Tratamento Capilar', 'Hidratação e tratamento', 80.00, 45, 'tratamento', true);

-- SERVIÇOS - Beta Moema
INSERT INTO services (id, barbershop_id, name, description, price, duration, category, active) VALUES
('0b222222-2222-2222-2222-111111111111', 'b2222222-2222-2222-2222-222222222222', 'Corte Clássico', 'Corte tradicional', 40.00, 25, 'corte', true),
('0b222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Barba Express', 'Barba rápida', 25.00, 15, 'barba', true),
('0b222222-2222-2222-2222-333333333333', 'b2222222-2222-2222-2222-222222222222', 'Combo Econômico', 'Corte e barba básicos', 55.00, 40, 'combo', true);

-- =====================================================
-- STAFF (Profissionais) - SEM user_id para teste
-- =====================================================

-- Staff Alpha Centro
INSERT INTO staff (id, barbershop_id, specialties, commission_rate, schedule, active) VALUES
('00fa1111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', ARRAY['corte', 'barba'], 40, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true}', true),
('00fa1111-1111-1111-1111-222222222222', 'a1111111-1111-1111-1111-111111111111', ARRAY['corte', 'barba', 'tratamento'], 45, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true}', true);

-- Staff Alpha Shopping
INSERT INTO staff (id, barbershop_id, specialties, commission_rate, schedule, active) VALUES
('00fa2222-2222-2222-2222-111111111111', 'a2222222-2222-2222-2222-222222222222', ARRAY['corte', 'design'], 50, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true, "sunday": true}', true),
('00fa2222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', ARRAY['barba', 'tratamento'], 45, '{"tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true}', true);

-- Staff Beta Jardins
INSERT INTO staff (id, barbershop_id, specialties, commission_rate, schedule, active) VALUES
('00fb1111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', ARRAY['corte', 'barba', 'tratamento'], 55, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true}', true),
('00fb1111-1111-1111-1111-222222222222', 'b1111111-1111-1111-1111-111111111111', ARRAY['corte'], 40, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true}', true);

-- Staff Beta Moema
INSERT INTO staff (id, barbershop_id, specialties, commission_rate, schedule, active) VALUES
('00fb2222-2222-2222-2222-111111111111', 'b2222222-2222-2222-2222-222222222222', ARRAY['corte', 'barba'], 45, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true}', true),
('00fb2222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', ARRAY['barba', 'design'], 50, '{"wednesday": true, "thursday": true, "friday": true, "saturday": true}', true);

-- =====================================================
-- CLIENTES - Alpha Centro
-- =====================================================
INSERT INTO clients (id, barbershop_id, name, email, phone, notes, tags, active, loyalty_points) VALUES
('ca111111-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'João Silva', 'joao.silva@email.com', '11999100001', 'Cliente desde 2023', ARRAY['VIP', 'regular'], true, 150),
('ca111111-0001-0001-0001-000000000002', 'a1111111-1111-1111-1111-111111111111', 'Carlos Oliveira', 'carlos.o@email.com', '11999100002', 'Prefere corte curto', ARRAY['regular'], true, 80),
('ca111111-0001-0001-0001-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Pedro Santos', 'pedro.s@email.com', '11999100003', NULL, ARRAY['novo'], true, 20);

-- CLIENTES - Alpha Shopping
INSERT INTO clients (id, barbershop_id, name, email, phone, notes, tags, active, loyalty_points) VALUES
('ca222222-0001-0001-0001-000000000001', 'a2222222-2222-2222-2222-222222222222', 'Roberto Almeida', 'roberto.a@email.com', '11999200001', 'Gosta de produtos premium', ARRAY['VIP'], true, 220),
('ca222222-0001-0001-0001-000000000002', 'a2222222-2222-2222-2222-222222222222', 'Fernando Costa', 'fernando.c@email.com', '11999200002', 'Agenda sempre aos sábados', ARRAY['regular'], true, 95),
('ca222222-0001-0001-0001-000000000003', 'a2222222-2222-2222-2222-222222222222', 'Marcos Lima', 'marcos.l@email.com', '11999200003', NULL, ARRAY['novo'], true, 10);

-- CLIENTES - Beta Jardins
INSERT INTO clients (id, barbershop_id, name, email, phone, notes, tags, active, loyalty_points) VALUES
('cb111111-0001-0001-0001-000000000001', 'b1111111-1111-1111-1111-111111111111', 'André Ferreira', 'andre.f@email.com', '11988100001', 'Executivo, horário de almoço', ARRAY['VIP', 'executivo'], true, 300),
('cb111111-0001-0001-0001-000000000002', 'b1111111-1111-1111-1111-111111111111', 'Lucas Mendes', 'lucas.m@email.com', '11988100002', 'Corte moderno', ARRAY['regular'], true, 120),
('cb111111-0001-0001-0001-000000000003', 'b1111111-1111-1111-1111-111111111111', 'Gabriel Rocha', 'gabriel.r@email.com', '11988100003', 'Primeira visita', ARRAY['novo'], true, 0);

-- CLIENTES - Beta Moema
INSERT INTO clients (id, barbershop_id, name, email, phone, notes, tags, active, loyalty_points) VALUES
('cb222222-0001-0001-0001-000000000001', 'b2222222-2222-2222-2222-222222222222', 'Ricardo Dias', 'ricardo.d@email.com', '11988200001', 'Cliente fiel', ARRAY['VIP'], true, 180),
('cb222222-0001-0001-0001-000000000002', 'b2222222-2222-2222-2222-222222222222', 'Bruno Souza', 'bruno.s@email.com', '11988200002', NULL, ARRAY['regular'], true, 65),
('cb222222-0001-0001-0001-000000000003', 'b2222222-2222-2222-2222-222222222222', 'Thiago Martins', 'thiago.m@email.com', '11988200003', 'Recomendação de amigo', ARRAY['novo'], true, 15);

-- =====================================================
-- AGENDAMENTOS - Próximos 7 dias
-- =====================================================

-- Alpha Centro - Agendamentos
INSERT INTO appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_time, status, client_name, client_phone, service_name, service_price) VALUES
('a00a0001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'ca111111-0001-0001-0001-000000000001', '00fa1111-1111-1111-1111-111111111111', '0a111111-1111-1111-1111-111111111111', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 'confirmado', 'João Silva', '11999100001', 'Corte Tradicional', 45.00),
('a00a0001-0001-0001-0001-000000000002', 'a1111111-1111-1111-1111-111111111111', 'ca111111-0001-0001-0001-000000000002', '00fa1111-1111-1111-1111-222222222222', '0a111111-1111-1111-1111-333333333333', NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 'pendente', 'Carlos Oliveira', '11999100002', 'Combo Corte + Barba', 70.00),
('a00a0001-0001-0001-0001-000000000003', 'a1111111-1111-1111-1111-111111111111', 'ca111111-0001-0001-0001-000000000003', '00fa1111-1111-1111-1111-111111111111', '0a111111-1111-1111-1111-222222222222', NOW() + INTERVAL '2 days' + INTERVAL '11 hours', 'pendente', 'Pedro Santos', '11999100003', 'Barba Completa', 35.00),
('a00a0001-0001-0001-0001-000000000004', 'a1111111-1111-1111-1111-111111111111', 'ca111111-0001-0001-0001-000000000001', '00fa1111-1111-1111-1111-111111111111', '0a111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days' + INTERVAL '10 hours', 'concluido', 'João Silva', '11999100001', 'Corte Tradicional', 45.00);

-- Alpha Shopping - Agendamentos
INSERT INTO appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_time, status, client_name, client_phone, service_name, service_price) VALUES
('a00a0002-0001-0001-0001-000000000001', 'a2222222-2222-2222-2222-222222222222', 'ca222222-0001-0001-0001-000000000001', '00fa2222-2222-2222-2222-111111111111', '0a222222-2222-2222-2222-333333333333', NOW() + INTERVAL '1 day' + INTERVAL '15 hours', 'confirmado', 'Roberto Almeida', '11999200001', 'Combo VIP', 95.00),
('a00a0002-0001-0001-0001-000000000002', 'a2222222-2222-2222-2222-222222222222', 'ca222222-0001-0001-0001-000000000002', '00fa2222-2222-2222-2222-222222222222', '0a222222-2222-2222-2222-222222222222', NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 'pendente', 'Fernando Costa', '11999200002', 'Barba Premium', 45.00),
('a00a0002-0001-0001-0001-000000000003', 'a2222222-2222-2222-2222-222222222222', 'ca222222-0001-0001-0001-000000000003', '00fa2222-2222-2222-2222-111111111111', '0a222222-2222-2222-2222-111111111111', NOW() + INTERVAL '3 days' + INTERVAL '11 hours', 'pendente', 'Marcos Lima', '11999200003', 'Corte Moderno', 55.00),
('a00a0002-0001-0001-0001-000000000004', 'a2222222-2222-2222-2222-222222222222', 'ca222222-0001-0001-0001-000000000001', '00fa2222-2222-2222-2222-111111111111', '0a222222-2222-2222-2222-333333333333', NOW() - INTERVAL '1 day' + INTERVAL '14 hours', 'concluido', 'Roberto Almeida', '11999200001', 'Combo VIP', 95.00);

-- Beta Jardins - Agendamentos
INSERT INTO appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_time, status, client_name, client_phone, service_name, service_price) VALUES
('b00b0001-0001-0001-0001-000000000001', 'b1111111-1111-1111-1111-111111111111', 'cb111111-0001-0001-0001-000000000001', '00fb1111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-111111111111', NOW() + INTERVAL '1 day' + INTERVAL '12 hours', 'confirmado', 'André Ferreira', '11988100001', 'Corte Executive', 65.00),
('b00b0001-0001-0001-0001-000000000002', 'b1111111-1111-1111-1111-111111111111', 'cb111111-0001-0001-0001-000000000002', '00fb1111-1111-1111-1111-222222222222', '0b111111-1111-1111-1111-111111111111', NOW() + INTERVAL '1 day' + INTERVAL '15 hours', 'pendente', 'Lucas Mendes', '11988100002', 'Corte Executive', 65.00),
('b00b0001-0001-0001-0001-000000000003', 'b1111111-1111-1111-1111-111111111111', 'cb111111-0001-0001-0001-000000000003', '00fb1111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-333333333333', NOW() + INTERVAL '2 days' + INTERVAL '9 hours', 'pendente', 'Gabriel Rocha', '11988100003', 'Tratamento Capilar', 80.00),
('b00b0001-0001-0001-0001-000000000004', 'b1111111-1111-1111-1111-111111111111', 'cb111111-0001-0001-0001-000000000001', '00fb1111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-222222222222', NOW() - INTERVAL '3 days' + INTERVAL '12 hours', 'concluido', 'André Ferreira', '11988100001', 'Barba Designer', 50.00),
('b00b0001-0001-0001-0001-000000000005', 'b1111111-1111-1111-1111-111111111111', 'cb111111-0001-0001-0001-000000000002', '00fb1111-1111-1111-1111-111111111111', '0b111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day' + INTERVAL '10 hours', 'concluido', 'Lucas Mendes', '11988100002', 'Corte Executive', 65.00);

-- Beta Moema - Agendamentos
INSERT INTO appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_time, status, client_name, client_phone, service_name, service_price) VALUES
('b00b0002-0001-0001-0001-000000000001', 'b2222222-2222-2222-2222-222222222222', 'cb222222-0001-0001-0001-000000000001', '00fb2222-2222-2222-2222-111111111111', '0b222222-2222-2222-2222-333333333333', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 'confirmado', 'Ricardo Dias', '11988200001', 'Combo Econômico', 55.00),
('b00b0002-0001-0001-0001-000000000002', 'b2222222-2222-2222-2222-222222222222', 'cb222222-0001-0001-0001-000000000002', '00fb2222-2222-2222-2222-222222222222', '0b222222-2222-2222-2222-222222222222', NOW() + INTERVAL '2 days' + INTERVAL '14 hours', 'pendente', 'Bruno Souza', '11988200002', 'Barba Express', 25.00),
('b00b0002-0001-0001-0001-000000000003', 'b2222222-2222-2222-2222-222222222222', 'cb222222-0001-0001-0001-000000000003', '00fb2222-2222-2222-2222-111111111111', '0b222222-2222-2222-2222-111111111111', NOW() + INTERVAL '3 days' + INTERVAL '11 hours', 'pendente', 'Thiago Martins', '11988200003', 'Corte Clássico', 40.00),
('b00b0002-0001-0001-0001-000000000004', 'b2222222-2222-2222-2222-222222222222', 'cb222222-0001-0001-0001-000000000001', '00fb2222-2222-2222-2222-111111111111', '0b222222-2222-2222-2222-333333333333', NOW() - INTERVAL '2 days' + INTERVAL '15 hours', 'concluido', 'Ricardo Dias', '11988200001', 'Combo Econômico', 55.00);

-- =====================================================
-- TRANSAÇÕES (Receitas dos concluídos)
-- =====================================================
INSERT INTO transactions (id, barbershop_id, type, amount, description, category, payment_method, created_at) VALUES
('1a000001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'receita', 45.00, 'Corte Tradicional - João Silva', 'servico', 'pix', NOW() - INTERVAL '2 days'),
('1a000001-0001-0001-0001-000000000002', 'a2222222-2222-2222-2222-222222222222', 'receita', 95.00, 'Combo VIP - Roberto Almeida', 'servico', 'cartao_credito', NOW() - INTERVAL '1 day'),
('1b000001-0001-0001-0001-000000000001', 'b1111111-1111-1111-1111-111111111111', 'receita', 50.00, 'Barba Designer - André Ferreira', 'servico', 'pix', NOW() - INTERVAL '3 days'),
('1b000001-0001-0001-0001-000000000002', 'b1111111-1111-1111-1111-111111111111', 'receita', 65.00, 'Corte Executive - Lucas Mendes', 'servico', 'dinheiro', NOW() - INTERVAL '1 day'),
('1b000001-0001-0001-0001-000000000003', 'b2222222-2222-2222-2222-222222222222', 'receita', 55.00, 'Combo Econômico - Ricardo Dias', 'servico', 'pix', NOW() - INTERVAL '2 days');
