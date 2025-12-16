-- ============================================
-- REORGANIZAÇÃO DA HIERARQUIA DE BARBEARIAS
-- Script completo - Execute de uma vez só
-- ============================================

-- Usar DO block para executar tudo em uma transação
DO $$
DECLARE
  matriz_id UUID;
BEGIN
  -- PASSO 1: Criar a barbearia principal "Barbearia do Bob" (matriz)
  INSERT INTO barbershops (id, name, address, phone, email, active, parent_id, created_at)
  SELECT 
    gen_random_uuid(),
    'Barbearia do Bob',
    address,
    phone,
    email,
    true,
    NULL,
    now()
  FROM barbershops 
  WHERE id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a'
  RETURNING id INTO matriz_id;

  RAISE NOTICE 'Matriz criada com ID: %', matriz_id;

  -- PASSO 2: Vincular as barbearias existentes como unidades
  UPDATE barbershops 
  SET parent_id = matriz_id, name = 'Unidade Vitória Régia'
  WHERE id = 'f281c874-be60-4a0b-80a8-307ac3c4cb9a';

  UPDATE barbershops 
  SET parent_id = matriz_id, name = 'Unidade Itatiaia'
  WHERE id = '57b7e647-2851-49ff-ab0e-bb7ed8537338';

  -- PASSO 3: Migrar dados compartilhados para a matriz
  UPDATE services SET barbershop_id = matriz_id
  WHERE barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338');

  UPDATE clients SET barbershop_id = matriz_id
  WHERE barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338');

  UPDATE staff SET barbershop_id = matriz_id
  WHERE barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338');

  UPDATE service_categories SET barbershop_id = matriz_id
  WHERE barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338');

  -- PASSO 4: Garantir acesso dos usuários à matriz
  INSERT INTO user_barbershops (user_id, barbershop_id, is_primary)
  SELECT DISTINCT ub.user_id, matriz_id, true
  FROM user_barbershops ub
  WHERE ub.barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338')
  ON CONFLICT (user_id, barbershop_id) DO UPDATE SET is_primary = true;

  UPDATE user_barbershops SET is_primary = false
  WHERE barbershop_id IN ('f281c874-be60-4a0b-80a8-307ac3c4cb9a', '57b7e647-2851-49ff-ab0e-bb7ed8537338');

  RAISE NOTICE 'Reorganização concluída com sucesso!';
END $$;

-- ============================================
-- VERIFICAÇÃO (execute após o bloco acima)
-- ============================================
SELECT 
  b.id,
  b.name,
  b.parent_id,
  CASE WHEN b.parent_id IS NULL THEN '🏢 Barbearia' ELSE '📍 Unidade' END as tipo,
  p.name as parent_name
FROM barbershops b
LEFT JOIN barbershops p ON b.parent_id = p.id
ORDER BY b.parent_id NULLS FIRST;
