-- ===============================================
-- SCRIPT DE CORREÇÃO DE RELACIONAMENTOS
-- BarberSmart Database
-- ===============================================
-- Este script cria/corrige todos os relacionamentos,
-- foreign keys, constraints e indexes necessários
-- ===============================================

-- ===== 1. REMOVER CONSTRAINTS ANTIGAS (se existirem) =====
-- Isso evita erros de "constraint já existe"

-- Remover FKs antigas se existirem
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- ===== 2. CRIAR FOREIGN KEYS CORRETAS =====

-- 2.1 profiles → auth.users (1:1)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 2.2 profiles → barbershops (N:1)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT profiles_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE SET NULL;

-- 2.3 user_roles → profiles (N:1)
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey CASCADE,
  ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2.4 user_roles → barbershops (N:1)
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT user_roles_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.5 clients → barbershops (N:1)
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT clients_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.6 services → barbershops (N:1)
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT services_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.7 staff → barbershops (N:1)
ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT staff_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.8 staff → profiles (N:1)
ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_user_id_fkey CASCADE,
  ADD CONSTRAINT staff_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2.9 appointments → barbershops (N:1)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT appointments_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.10 appointments → clients (N:1)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_client_id_fkey CASCADE,
  ADD CONSTRAINT appointments_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES public.clients(id) 
    ON DELETE RESTRICT;

-- 2.11 appointments → staff (N:1)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey CASCADE,
  ADD CONSTRAINT appointments_staff_id_fkey 
    FOREIGN KEY (staff_id) 
    REFERENCES public.staff(id) 
    ON DELETE RESTRICT;

-- 2.12 appointments → services (N:1)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_service_id_fkey CASCADE,
  ADD CONSTRAINT appointments_service_id_fkey 
    FOREIGN KEY (service_id) 
    REFERENCES public.services(id) 
    ON DELETE RESTRICT;

-- 2.13 transactions → barbershops (N:1)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT transactions_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- 2.14 transactions → appointments (N:1) - NULLABLE
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_appointment_id_fkey CASCADE,
  ADD CONSTRAINT transactions_appointment_id_fkey 
    FOREIGN KEY (appointment_id) 
    REFERENCES public.appointments(id) 
    ON DELETE SET NULL;

-- 2.15 transactions → profiles (N:1)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_created_by_fkey CASCADE,
  ADD CONSTRAINT transactions_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 2.16 campaigns → barbershops (N:1)
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_barbershop_id_fkey CASCADE,
  ADD CONSTRAINT campaigns_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) 
    REFERENCES public.barbershops(id) 
    ON DELETE CASCADE;

-- ===== 3. CRIAR UNIQUE CONSTRAINTS =====

-- 3.1 staff: Um usuário pode ser staff apenas uma vez por barbearia
ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_barbershop_user_unique CASCADE,
  ADD CONSTRAINT staff_barbershop_user_unique 
    UNIQUE (barbershop_id, user_id);

-- 3.2 user_roles: Um usuário não pode ter a mesma role duas vezes na mesma barbearia
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_role_barbershop_unique CASCADE,
  ADD CONSTRAINT user_roles_user_role_barbershop_unique 
    UNIQUE (user_id, role, barbershop_id);

-- ===== 4. CRIAR INDEXES PARA PERFORMANCE =====

-- Profiles
DROP INDEX IF EXISTS idx_profiles_barbershop_id CASCADE;
CREATE INDEX idx_profiles_barbershop_id ON public.profiles(barbershop_id);

-- User Roles
DROP INDEX IF EXISTS idx_user_roles_user_id CASCADE;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

DROP INDEX IF EXISTS idx_user_roles_barbershop_id CASCADE;
CREATE INDEX idx_user_roles_barbershop_id ON public.user_roles(barbershop_id);

-- Clients
DROP INDEX IF EXISTS idx_clients_barbershop_id CASCADE;
CREATE INDEX idx_clients_barbershop_id ON public.clients(barbershop_id);

DROP INDEX IF EXISTS idx_clients_phone CASCADE;
CREATE INDEX idx_clients_phone ON public.clients(phone);

DROP INDEX IF EXISTS idx_clients_active CASCADE;
CREATE INDEX idx_clients_active ON public.clients(barbershop_id, active);

-- Services
DROP INDEX IF EXISTS idx_services_barbershop_id CASCADE;
CREATE INDEX idx_services_barbershop_id ON public.services(barbershop_id);

DROP INDEX IF EXISTS idx_services_active CASCADE;
CREATE INDEX idx_services_active ON public.services(barbershop_id, active);

-- Staff
DROP INDEX IF EXISTS idx_staff_barbershop_id CASCADE;
CREATE INDEX idx_staff_barbershop_id ON public.staff(barbershop_id);

DROP INDEX IF EXISTS idx_staff_user_id CASCADE;
CREATE INDEX idx_staff_user_id ON public.staff(user_id);

DROP INDEX IF EXISTS idx_staff_active CASCADE;
CREATE INDEX idx_staff_active ON public.staff(barbershop_id, active);

-- Appointments
DROP INDEX IF EXISTS idx_appointments_barbershop_id CASCADE;
CREATE INDEX idx_appointments_barbershop_id ON public.appointments(barbershop_id);

DROP INDEX IF EXISTS idx_appointments_client_id CASCADE;
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);

DROP INDEX IF EXISTS idx_appointments_staff_id CASCADE;
CREATE INDEX idx_appointments_staff_id ON public.appointments(staff_id);

DROP INDEX IF EXISTS idx_appointments_service_id CASCADE;
CREATE INDEX idx_appointments_service_id ON public.appointments(service_id);

DROP INDEX IF EXISTS idx_appointments_date CASCADE;
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);

DROP INDEX IF EXISTS idx_appointments_date_staff CASCADE;
CREATE INDEX idx_appointments_date_staff ON public.appointments(staff_id, appointment_date);

DROP INDEX IF EXISTS idx_appointments_status CASCADE;
CREATE INDEX idx_appointments_status ON public.appointments(barbershop_id, status);

-- Transactions
DROP INDEX IF EXISTS idx_transactions_barbershop_id CASCADE;
CREATE INDEX idx_transactions_barbershop_id ON public.transactions(barbershop_id);

DROP INDEX IF EXISTS idx_transactions_appointment_id CASCADE;
CREATE INDEX idx_transactions_appointment_id ON public.transactions(appointment_id) 
WHERE appointment_id IS NOT NULL;

DROP INDEX IF EXISTS idx_transactions_created_by CASCADE;
CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);

DROP INDEX IF EXISTS idx_transactions_date CASCADE;
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);

DROP INDEX IF EXISTS idx_transactions_type CASCADE;
CREATE INDEX idx_transactions_type ON public.transactions(barbershop_id, type);

-- Campaigns
DROP INDEX IF EXISTS idx_campaigns_barbershop_id CASCADE;
CREATE INDEX idx_campaigns_barbershop_id ON public.campaigns(barbershop_id);

DROP INDEX IF EXISTS idx_campaigns_status CASCADE;
CREATE INDEX idx_campaigns_status ON public.campaigns(barbershop_id, status);

-- ===== 5. VALIDAÇÃO FINAL =====

-- Verificar se há registros órfãos
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- Verificar profiles órfãos
    SELECT COUNT(*) INTO orphan_count
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
    
    IF orphan_count > 0 THEN
        RAISE WARNING 'Encontrados % profiles órfãos (sem auth.users correspondente)', orphan_count;
    END IF;

    -- Verificar user_roles órfãos
    SELECT COUNT(*) INTO orphan_count
    FROM public.user_roles ur
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id);
    
    IF orphan_count > 0 THEN
        RAISE WARNING 'Encontrados % user_roles órfãos', orphan_count;
    END IF;

    -- Verificar staff órfãos
    SELECT COUNT(*) INTO orphan_count
    FROM public.staff st
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = st.user_id);
    
    IF orphan_count > 0 THEN
        RAISE WARNING 'Encontrados % staff órfãos', orphan_count;
    END IF;

    RAISE NOTICE '✓ Validação de relacionamentos concluída!';
END $$;

-- Exibir resumo de foreign keys criadas
SELECT 
    tc.table_name AS tabela,
    kcu.column_name AS coluna,
    ccu.table_name AS referencia_tabela,
    ccu.column_name AS referencia_coluna,
    rc.delete_rule AS ao_deletar
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
