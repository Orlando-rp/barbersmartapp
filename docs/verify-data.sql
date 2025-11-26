-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DE DADOS - BARBERSMART
-- Execute este SQL para verificar se todos os dados foram inseridos corretamente
-- =====================================================

-- 1. VERIFICAR BARBEARIAS
SELECT 
  '🏪 BARBEARIAS' as categoria,
  COUNT(*) as total,
  STRING_AGG(name, ', ') as nomes
FROM barbershops;

-- 2. VERIFICAR PERFIS DE USUÁRIOS
SELECT 
  '👤 PERFIS' as categoria,
  COUNT(*) as total,
  STRING_AGG(full_name, ', ') as nomes
FROM profiles;

-- 3. VERIFICAR ROLES DOS USUÁRIOS
SELECT 
  '🔐 ROLES' as categoria,
  ur.role,
  COUNT(*) as total,
  STRING_AGG(p.full_name, ', ') as usuarios
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
GROUP BY ur.role
ORDER BY ur.role;

-- 4. VERIFICAR EQUIPE (STAFF)
SELECT 
  '💼 EQUIPE' as categoria,
  COUNT(*) as total_barbeiros,
  STRING_AGG(p.full_name || ' (' || array_to_string(s.specialties, ', ') || ')', E'\n') as barbeiros_e_especialidades
FROM staff s
JOIN profiles p ON p.id = s.user_id;

-- 5. VERIFICAR SERVIÇOS
SELECT 
  '✂️ SERVIÇOS' as categoria,
  COUNT(*) as total_servicos,
  ROUND(AVG(price)::numeric, 2) as preco_medio,
  STRING_AGG(name || ' - R$ ' || price::text, E'\n') as servicos
FROM services;

-- 6. VERIFICAR CLIENTES
SELECT 
  '👥 CLIENTES' as categoria,
  COUNT(*) as total_clientes,
  COUNT(CASE WHEN 'vip' = ANY(tags) THEN 1 END) as clientes_vip,
  COUNT(CASE WHEN 'novo' = ANY(tags) THEN 1 END) as clientes_novos,
  COUNT(CASE WHEN active = true THEN 1 END) as clientes_ativos
FROM clients;

-- 7. VERIFICAR AGENDAMENTOS
SELECT 
  '📅 AGENDAMENTOS' as categoria,
  status,
  COUNT(*) as total,
  STRING_AGG(
    client_name || ' - ' || service_name || ' (' || TO_CHAR(appointment_date, 'DD/MM') || ' às ' || appointment_time::text || ')',
    E'\n'
  ) as detalhes
FROM appointments
GROUP BY status
ORDER BY status;

-- 8. VERIFICAR TRANSAÇÕES
SELECT 
  '💰 TRANSAÇÕES' as categoria,
  type,
  COUNT(*) as total_transacoes,
  SUM(amount) as total_valor,
  STRING_AGG(
    description || ' - R$ ' || amount::text || ' (' || payment_method || ')',
    E'\n'
  ) as detalhes
FROM transactions
GROUP BY type
ORDER BY type;

-- 9. VERIFICAR CAMPANHAS DE MARKETING
SELECT 
  '📢 CAMPANHAS' as categoria,
  COUNT(*) as total,
  STRING_AGG(name || ' (' || status || ')', ', ') as campanhas
FROM campaigns;

-- =====================================================
-- VERIFICAÇÃO DETALHADA DE INTEGRIDADE
-- =====================================================

-- 10. VERIFICAR RELACIONAMENTOS
SELECT 
  '🔗 INTEGRIDADE' as verificacao,
  'Todos os agendamentos têm cliente válido' as checagem,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ ERRO: ' || COUNT(*) || ' agendamentos sem cliente'
  END as resultado
FROM appointments a
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = a.client_id)

UNION ALL

SELECT 
  '🔗 INTEGRIDADE',
  'Todos os agendamentos têm barbeiro válido',
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ ERRO: ' || COUNT(*) || ' agendamentos sem barbeiro'
  END
FROM appointments a
WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = a.staff_id)

UNION ALL

SELECT 
  '🔗 INTEGRIDADE',
  'Todos os agendamentos têm serviço válido',
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ ERRO: ' || COUNT(*) || ' agendamentos sem serviço'
  END
FROM appointments a
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.id = a.service_id)

UNION ALL

SELECT 
  '🔗 INTEGRIDADE',
  'Todos os perfis têm role atribuída',
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK'
    ELSE '❌ ERRO: ' || COUNT(*) || ' perfis sem role'
  END
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id);

-- =====================================================
-- RESUMO GERAL
-- =====================================================

SELECT 
  '📊 RESUMO GERAL' as titulo,
  (SELECT COUNT(*) FROM barbershops) as barbearias,
  (SELECT COUNT(*) FROM profiles) as usuarios,
  (SELECT COUNT(*) FROM staff) as barbeiros,
  (SELECT COUNT(*) FROM services) as servicos,
  (SELECT COUNT(*) FROM clients) as clientes,
  (SELECT COUNT(*) FROM appointments) as agendamentos,
  (SELECT COUNT(*) FROM transactions) as transacoes,
  (SELECT COUNT(*) FROM campaigns) as campanhas;

-- =====================================================
-- VERIFICAR DADOS ESPECÍFICOS PARA TESTE
-- =====================================================

-- Mostrar detalhes dos usuários de teste com suas roles
SELECT 
  p.full_name as nome,
  ur.role as funcao,
  p.phone as telefone,
  b.name as barbearia,
  CASE 
    WHEN ur.role = 'super_admin' THEN 'Acesso global a todas barbearias'
    WHEN ur.role = 'admin' THEN 'Gerenciamento completo da barbearia'
    WHEN ur.role = 'barbeiro' THEN 'Gestão de agendamentos e clientes'
    WHEN ur.role = 'recepcionista' THEN 'Gestão de agendamentos'
  END as descricao_acesso
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN barbershops b ON b.id = p.barbershop_id
ORDER BY 
  CASE ur.role 
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'barbeiro' THEN 3
    WHEN 'recepcionista' THEN 4
  END;
