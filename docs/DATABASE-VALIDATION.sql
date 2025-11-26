-- ===============================================
-- SCRIPT DE VALIDAÇÃO DE RELACIONAMENTOS
-- BarberSmart Database
-- ===============================================
-- Este script verifica a integridade de todos os
-- relacionamentos e constraints do banco de dados
-- ===============================================

-- 1. VERIFICAR FOREIGN KEYS EXISTENTES
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 2. VERIFICAR INDEXES EXISTENTES
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3. VERIFICAR UNIQUE CONSTRAINTS
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. VERIFICAR ORPHAN RECORDS
-- Profiles sem auth.users
SELECT 'profiles sem auth.users' as issue, count(*) as count
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
);

-- Profiles com barbershop_id inválido
SELECT 'profiles com barbershop_id inválido' as issue, count(*) as count
FROM profiles p
WHERE p.barbershop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = p.barbershop_id
);

-- user_roles com user_id inválido
SELECT 'user_roles com user_id inválido' as issue, count(*) as count
FROM user_roles ur
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = ur.user_id
);

-- user_roles com barbershop_id inválido
SELECT 'user_roles com barbershop_id inválido' as issue, count(*) as count
FROM user_roles ur
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = ur.barbershop_id
);

-- clients com barbershop_id inválido
SELECT 'clients com barbershop_id inválido' as issue, count(*) as count
FROM clients c
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = c.barbershop_id
);

-- services com barbershop_id inválido
SELECT 'services com barbershop_id inválido' as issue, count(*) as count
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = s.barbershop_id
);

-- staff com barbershop_id inválido
SELECT 'staff com barbershop_id inválido' as issue, count(*) as count
FROM staff st
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = st.barbershop_id
);

-- staff com user_id inválido
SELECT 'staff com user_id inválido' as issue, count(*) as count
FROM staff st
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = st.user_id
);

-- appointments com foreign keys inválidos
SELECT 'appointments com barbershop_id inválido' as issue, count(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = a.barbershop_id
);

SELECT 'appointments com client_id inválido' as issue, count(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.id = a.client_id
);

SELECT 'appointments com staff_id inválido' as issue, count(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM staff s WHERE s.id = a.staff_id
);

SELECT 'appointments com service_id inválido' as issue, count(*) as count
FROM appointments a
WHERE NOT EXISTS (
    SELECT 1 FROM services s WHERE s.id = a.service_id
);

-- transactions com foreign keys inválidos
SELECT 'transactions com barbershop_id inválido' as issue, count(*) as count
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = t.barbershop_id
);

SELECT 'transactions com appointment_id inválido' as issue, count(*) as count
FROM transactions t
WHERE t.appointment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM appointments a WHERE a.id = t.appointment_id
);

SELECT 'transactions com created_by inválido' as issue, count(*) as count
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = t.created_by
);

-- campaigns com barbershop_id inválido
SELECT 'campaigns com barbershop_id inválido' as issue, count(*) as count
FROM campaigns c
WHERE NOT EXISTS (
    SELECT 1 FROM barbershops b WHERE b.id = c.barbershop_id
);

-- 5. VERIFICAR INCONSISTÊNCIAS DE DADOS
-- Appointments onde staff, client e service não pertencem à mesma barbearia
SELECT 
    'appointments com staff de outra barbearia' as issue, 
    count(*) as count
FROM appointments a
JOIN staff s ON a.staff_id = s.id
WHERE a.barbershop_id != s.barbershop_id;

SELECT 
    'appointments com client de outra barbearia' as issue, 
    count(*) as count
FROM appointments a
JOIN clients c ON a.client_id = c.id
WHERE a.barbershop_id != c.barbershop_id;

SELECT 
    'appointments com service de outra barbearia' as issue, 
    count(*) as count
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE a.barbershop_id != s.barbershop_id;

-- staff onde user não tem profile com mesmo barbershop_id
SELECT 
    'staff onde profile tem barbershop_id diferente' as issue, 
    count(*) as count
FROM staff st
JOIN profiles p ON st.user_id = p.id
WHERE st.barbershop_id != p.barbershop_id;

-- 6. VERIFICAR RLS POLICIES
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. VERIFICAR TRIGGERS
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 8. VERIFICAR FUNÇÕES SECURITY DEFINER
SELECT
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY routine_name;
