-- ============================================
-- REORGANIZAÇÃO DA HIERARQUIA DE BARBEARIAS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- PASSO 1: Criar a barbearia principal "Barbearia do Bob" (matriz)
-- Usando dados da barbearia Vitória Régia como base
INSERT INTO barbershops (id, name, address, phone, email, active, parent_id, created_at)
SELECT 
  gen_random_uuid(),
  'Barbearia do Bob',
  address,
  phone,
  email,
  true,
  NULL, -- parent_id NULL indica que é matriz
  now()
FROM barbershops 
WHERE id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a'
RETURNING id;

-- ⚠️ IMPORTANTE: Anote o ID retornado acima e substitua '<MATRIZ_ID>' abaixo
-- Exemplo: se retornou 'abc123-...', substitua todas ocorrências de '<MATRIZ_ID>' por 'abc123-...'

-- ============================================
-- APÓS OBTER O ID DA MATRIZ, EXECUTE OS PASSOS ABAIXO
-- ============================================

-- PASSO 2: Vincular as barbearias existentes como unidades da matriz
-- Substitua <MATRIZ_ID> pelo ID retornado no passo 1

-- Atualizar Vitória Régia como unidade
UPDATE barbershops 
SET 
  parent_id = '<MATRIZ_ID>',
  name = 'Unidade Vitória Régia'
WHERE id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a';

-- Atualizar Itatiaia como unidade
UPDATE barbershops 
SET 
  parent_id = '<MATRIZ_ID>',
  name = 'Unidade Itatiaia'
WHERE id = '57b7e647-2851-49ff-ab0e-bb7ed8537338';

-- PASSO 3: Migrar dados compartilhados para a matriz
-- Substitua <MATRIZ_ID> pelo ID retornado no passo 1

-- Migrar serviços para a matriz
UPDATE services 
SET barbershop_id = '<MATRIZ_ID>'
WHERE barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
);

-- Migrar clientes para a matriz
UPDATE clients 
SET barbershop_id = '<MATRIZ_ID>'
WHERE barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
);

-- Migrar staff para a matriz
UPDATE staff 
SET barbershop_id = '<MATRIZ_ID>'
WHERE barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
);

-- Migrar categorias de serviço para a matriz
UPDATE service_categories 
SET barbershop_id = '<MATRIZ_ID>'
WHERE barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
);

-- PASSO 4: Garantir acesso dos usuários à matriz
-- Substitua <MATRIZ_ID> pelo ID retornado no passo 1

INSERT INTO user_barbershops (user_id, barbershop_id, is_primary)
SELECT DISTINCT ub.user_id, '<MATRIZ_ID>', true
FROM user_barbershops ub
WHERE ub.barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
)
ON CONFLICT (user_id, barbershop_id) DO UPDATE SET is_primary = true;

-- Atualizar as unidades para não serem primárias
UPDATE user_barbershops 
SET is_primary = false
WHERE barbershop_id IN (
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
);

-- ============================================
-- DADOS QUE PERMANECEM NAS UNIDADES (NÃO MIGRAR)
-- ============================================
-- ✅ business_hours - Cada unidade mantém seus horários
-- ✅ blocked_dates - Cada unidade mantém suas datas bloqueadas  
-- ✅ special_hours - Cada unidade mantém seus horários especiais
-- ✅ appointments - Agendamentos são por unidade
-- ✅ transactions - Finanças são por unidade

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute para verificar a hierarquia:
SELECT 
  b.id,
  b.name,
  b.parent_id,
  CASE WHEN b.parent_id IS NULL THEN '🏢 Matriz' ELSE '📍 Unidade' END as tipo,
  p.name as parent_name
FROM barbershops b
LEFT JOIN barbershops p ON b.parent_id = p.id
WHERE b.id IN (
  '<MATRIZ_ID>',
  'f281c874-be60-4a0b-80a8-307ac3c4cb9a',
  '57b7e647-2851-49ff-ab0e-bb7ed8537338'
)
ORDER BY b.parent_id NULLS FIRST;

-- Verificar contagem de dados migrados:
SELECT 
  'services' as tabela, 
  COUNT(*) as total,
  barbershop_id
FROM services 
WHERE barbershop_id = '<MATRIZ_ID>'
GROUP BY barbershop_id
UNION ALL
SELECT 
  'clients' as tabela, 
  COUNT(*) as total,
  barbershop_id
FROM clients 
WHERE barbershop_id = '<MATRIZ_ID>'
GROUP BY barbershop_id
UNION ALL
SELECT 
  'staff' as tabela, 
  COUNT(*) as total,
  barbershop_id
FROM staff 
WHERE barbershop_id = '<MATRIZ_ID>'
GROUP BY barbershop_id;
