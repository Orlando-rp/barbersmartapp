-- =============================================================================
-- SEED DATA: Serviços de Barbearia
-- Execute este script no Supabase SQL Editor para cadastrar serviços padrão
-- =============================================================================

-- Primeiro, obter o barbershop_id correto (ajuste conforme necessário)
-- Substitua o UUID abaixo pelo ID da sua barbearia

-- IMPORTANTE: Antes de executar, verifique se as categorias existem:
-- SELECT * FROM service_categories WHERE barbershop_id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a';

-- =============================================================================
-- SERVIÇOS DE CORTE
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Corte Masculino', 'Corte de cabelo masculino tradicional com acabamento na máquina e tesoura', 'Corte', 45.00, 30, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Corte Degradê', 'Corte degradê com transição suave, estilo moderno e jovem', 'Corte', 55.00, 40, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Corte Infantil', 'Corte de cabelo para crianças até 12 anos com paciência e carinho', 'Corte', 35.00, 25, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Corte Navalhado', 'Corte com navalha para acabamento perfeito e riscos no cabelo', 'Corte', 60.00, 45, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Corte Social', 'Corte clássico social para ambiente corporativo', 'Corte', 50.00, 35, true);

-- =============================================================================
-- SERVIÇOS DE BARBA
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Barba Completa', 'Aparar, modelar e desenhar a barba com navalha e toalha quente', 'Barba', 40.00, 30, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Barba Simples', 'Aparo rápido e alinhamento da barba', 'Barba', 25.00, 15, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Barba na Navalha', 'Barba feita completamente na navalha tradicional com toalha quente', 'Barba', 50.00, 40, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Bigode', 'Aparo e alinhamento do bigode', 'Barba', 15.00, 10, true);

-- =============================================================================
-- SERVIÇOS DE SOBRANCELHA
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Design de Sobrancelha', 'Design e modelagem completa das sobrancelhas', 'Sobrancelha', 25.00, 15, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Sobrancelha Simples', 'Aparar e alinhar sobrancelhas', 'Sobrancelha', 15.00, 10, true);

-- =============================================================================
-- COMBOS (Pacotes)
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Combo Corte + Barba', 'Corte masculino completo + barba completa com desconto especial', 'Combo', 75.00, 60, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Combo Completo', 'Corte + barba + sobrancelha - pacote premium', 'Combo', 90.00, 75, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Combo Degradê + Barba', 'Corte degradê moderno + barba completa', 'Combo', 85.00, 70, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Combo Pai e Filho', 'Corte para pai e filho (até 12 anos) com desconto especial', 'Combo', 70.00, 50, true);

-- =============================================================================
-- TRATAMENTOS
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Hidratação Capilar', 'Tratamento de hidratação profunda para cabelos ressecados', 'Tratamento', 60.00, 45, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Relaxamento', 'Alisamento e relaxamento capilar', 'Tratamento', 80.00, 60, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Pigmentação de Barba', 'Coloração e cobertura de falhas na barba', 'Tratamento', 70.00, 45, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Limpeza de Pele', 'Limpeza facial profissional masculina', 'Tratamento', 50.00, 40, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Platinado', 'Descoloração e platinado completo', 'Tratamento', 120.00, 90, true);

-- =============================================================================
-- OUTROS SERVIÇOS
-- =============================================================================
INSERT INTO services (barbershop_id, name, description, category, price, duration, active) VALUES
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Lavagem de Cabelo', 'Lavagem com shampoo especial e massagem relaxante', 'Outros', 20.00, 15, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Luzes/Mechas', 'Luzes ou mechas no cabelo com descoloração parcial', 'Outros', 100.00, 90, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Depilação Nasal', 'Remoção de pelos do nariz com cera', 'Outros', 15.00, 10, true),
('f281c874-be60-4a0b-80a8-307ac3c4cb9a', 'Depilação Auricular', 'Remoção de pelos das orelhas com cera', 'Outros', 15.00, 10, true);

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- Execute para verificar os serviços cadastrados:
-- SELECT name, category, price, duration FROM services 
-- WHERE barbershop_id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a'
-- ORDER BY category, name;
