-- ============================================
-- REORGANIZAÇÃO DA HIERARQUIA DE BARBEARIAS
-- Estratégia: Renomear + Ativar + Limpar
-- Execute no Supabase SQL Editor
-- ============================================

-- PASSO 1: Verificar dependências da barbearia vazia antes de deletar
SELECT 
  'user_barbershops' as tabela,
  COUNT(*) as registros
FROM user_barbershops 
WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67'
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67'
UNION ALL
SELECT 'whatsapp_config', COUNT(*) FROM whatsapp_config WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67'
UNION ALL
SELECT 'business_hours', COUNT(*) FROM business_hours WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';

-- ============================================
-- PASSO 2: Executar reorganização (COPIE E EXECUTE)
-- ============================================

DO $$
BEGIN
  -- 2.1: Transferir user_barbershops da barbearia vazia para a matriz correta
  UPDATE user_barbershops 
  SET barbershop_id = '77b96154-64b6-4b74-aa0d-4da89aacbb5c'
  WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67'
  AND NOT EXISTS (
    SELECT 1 FROM user_barbershops ub2 
    WHERE ub2.user_id = user_barbershops.user_id 
    AND ub2.barbershop_id = '77b96154-64b6-4b74-aa0d-4da89aacbb5c'
  );
  RAISE NOTICE 'User_barbershops transferidos';

  -- 2.2: Remover duplicatas em user_barbershops (se existirem)
  DELETE FROM user_barbershops 
  WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';
  RAISE NOTICE 'Vínculos antigos removidos';

  -- 2.3: Limpar outras dependências da barbearia vazia
  DELETE FROM subscriptions WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';
  DELETE FROM whatsapp_config WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';
  DELETE FROM business_hours WHERE barbershop_id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';
  RAISE NOTICE 'Dependências limpas';

  -- 2.4: Renomear "Barbearia Teste" para "Barbearia do Bob" e ativar
  UPDATE barbershops 
  SET name = 'Barbearia do Bob', active = true
  WHERE id = '77b96154-64b6-4b74-aa0d-4da89aacbb5c';
  RAISE NOTICE 'Matriz renomeada e ativada';

  -- 2.5: Remover a barbearia duplicada vazia
  DELETE FROM barbershops 
  WHERE id = '3a4247d3-d9d7-427b-aa2c-06b3e0222c67';
  RAISE NOTICE 'Barbearia duplicada removida';

  RAISE NOTICE '✅ Reorganização concluída com sucesso!';
END $$;

-- ============================================
-- PASSO 3: Verificar resultado final
-- ============================================

SELECT 
  b.id,
  b.name,
  b.parent_id,
  b.active,
  CASE 
    WHEN b.parent_id IS NULL THEN '🏠 Barbearia'
    ELSE '⎇ Unidade'
  END as tipo,
  p.name as vinculado_a
FROM barbershops b
LEFT JOIN barbershops p ON b.parent_id = p.id
ORDER BY b.parent_id NULLS FIRST, b.name;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- | id         | name                  | parent_id  | active | tipo        | vinculado_a      |
-- |------------|----------------------|------------|--------|-------------|------------------|
-- | 77b96154...| Barbearia do Bob     | NULL       | true   | 🏠 Barbearia | NULL             |
-- | 57b7e647...| Unidade Itatiaia     | 77b96154...| true   | ⎇ Unidade   | Barbearia do Bob |
-- | f281c874...| Unidade Vitória Régia| 77b96154...| true   | ⎇ Unidade   | Barbearia do Bob |
