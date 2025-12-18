-- =====================================================
-- CORREÇÃO COMPLETA DO AGENDAMENTO PÚBLICO
-- =====================================================
-- Este script corrige todos os problemas de RLS e permissões
-- para o fluxo de agendamento público funcionar corretamente.
-- Execute TODO este script no Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- PARTE 0: ADICIONAR COLUNA DURATION AO APPOINTMENTS
-- =====================================================

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;

-- Atualizar agendamentos existentes com a duração do serviço
UPDATE public.appointments a
SET duration = COALESCE(
  (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
  30
)
WHERE a.duration IS NULL OR a.duration = 30;

COMMENT ON COLUMN public.appointments.duration IS 'Duração do agendamento em minutos, copiada do serviço no momento da reserva';

-- =====================================================
-- PARTE 1: RPC PARA BUSCAR HORÁRIOS OCUPADOS
-- =====================================================

DROP FUNCTION IF EXISTS public.get_occupied_slots(UUID, UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_occupied_slots(
  p_barbershop_id UUID,
  p_staff_id UUID,
  p_date DATE
)
RETURNS TABLE(appointment_time TIME, duration INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.appointment_time::TIME, COALESCE(a.duration, 30)::INTEGER as duration
  FROM appointments a
  WHERE a.barbershop_id = p_barbershop_id
    AND a.staff_id = p_staff_id
    AND a.appointment_date = p_date
    AND a.status NOT IN ('cancelado', 'falta');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_occupied_slots(UUID, UUID, DATE) TO anon, authenticated;

COMMENT ON FUNCTION public.get_occupied_slots IS 'Retorna os horários ocupados de um profissional em uma data específica. Usado pela página de agendamento público para verificar disponibilidade.';

-- =====================================================
-- PARTE 2: POLÍTICAS RLS PARA DADOS PÚBLICOS
-- =====================================================

-- Remover políticas existentes para anon
DROP POLICY IF EXISTS "Anon can view active barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Anon can view active services" ON public.services;
DROP POLICY IF EXISTS "Anon can view active staff" ON public.staff;
DROP POLICY IF EXISTS "Anon can view staff_units" ON public.staff_units;
DROP POLICY IF EXISTS "Anon can view staff_services" ON public.staff_services;
DROP POLICY IF EXISTS "Anon can view business_hours" ON public.business_hours;
DROP POLICY IF EXISTS "Anon can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anon can view barbershop_domains" ON public.barbershop_domains;

-- Barbershops: Permitir anon ver barbearias ativas
CREATE POLICY "Anon can view active barbershops"
ON public.barbershops
FOR SELECT TO anon
USING (active = true);

-- Services: Permitir anon ver serviços ativos
CREATE POLICY "Anon can view active services"
ON public.services
FOR SELECT TO anon
USING (active = true);

-- Staff: Permitir anon ver staff ativo
CREATE POLICY "Anon can view active staff"
ON public.staff
FOR SELECT TO anon
USING (active = true);

-- Staff_units: Permitir anon ver se tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_units') THEN
    EXECUTE 'CREATE POLICY "Anon can view staff_units" ON public.staff_units FOR SELECT TO anon USING (active = true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Staff_services: Permitir anon ver se tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_services') THEN
    EXECUTE 'CREATE POLICY "Anon can view staff_services" ON public.staff_services FOR SELECT TO anon USING (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Business_hours: Permitir anon ver
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_hours') THEN
    EXECUTE 'CREATE POLICY "Anon can view business_hours" ON public.business_hours FOR SELECT TO anon USING (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: Permitir anon ver informações básicas
CREATE POLICY "Anon can view basic profile info"
ON public.profiles
FOR SELECT TO anon
USING (true);

-- Service_categories: Permitir anon ver se tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_categories') THEN
    EXECUTE 'CREATE POLICY "Anon can view service_categories" ON public.service_categories FOR SELECT TO anon USING (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Barbershop_domains: Permitir anon ver se tabela existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barbershop_domains') THEN
    EXECUTE 'CREATE POLICY "Anon can view barbershop_domains" ON public.barbershop_domains FOR SELECT TO anon USING (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PARTE 3: RPC PARA CRIAÇÃO DE AGENDAMENTO PÚBLICO
-- =====================================================

DROP FUNCTION IF EXISTS public.create_public_appointment(UUID, UUID, UUID, DATE, TIME, INTEGER, TEXT, TEXT, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS public.create_public_appointment(UUID, UUID, UUID, DATE, TIME, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_barbershop_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_duration INTEGER,
  p_service_price NUMERIC,
  p_service_name TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_client_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_appointment_id UUID;
  v_end_time TIME;
  v_conflict_count INTEGER;
  v_matriz_id UUID;
BEGIN
  -- 1. Validar se a barbearia existe e está ativa
  IF NOT EXISTS (SELECT 1 FROM barbershops WHERE id = p_barbershop_id AND active = true) THEN
    RETURN json_build_object('success', false, 'error', 'Barbearia não encontrada ou inativa');
  END IF;

  -- 2. Validar se o staff existe e está ativo
  IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_staff_id AND active = true) THEN
    RETURN json_build_object('success', false, 'error', 'Profissional não encontrado ou inativo');
  END IF;

  -- 3. Validar se o serviço existe e está ativo
  IF NOT EXISTS (SELECT 1 FROM services WHERE id = p_service_id AND active = true) THEN
    RETURN json_build_object('success', false, 'error', 'Serviço não encontrado ou inativo');
  END IF;

  -- 4. Calcular horário de término
  v_end_time := p_appointment_time + (p_duration || ' minutes')::INTERVAL;

  -- 5. Verificar conflito de horário
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments a
  WHERE a.staff_id = p_staff_id
    AND a.appointment_date = p_appointment_date
    AND a.status NOT IN ('cancelado', 'falta')
    AND (
      (p_appointment_time >= a.appointment_time AND p_appointment_time < (a.appointment_time + (COALESCE(a.duration, 30) || ' minutes')::INTERVAL))
      OR
      (v_end_time > a.appointment_time AND v_end_time <= (a.appointment_time + (COALESCE(a.duration, 30) || ' minutes')::INTERVAL))
      OR
      (p_appointment_time <= a.appointment_time AND v_end_time >= (a.appointment_time + (COALESCE(a.duration, 30) || ' minutes')::INTERVAL))
    );

  IF v_conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Horário já está reservado. Por favor, escolha outro horário.', 'code', 'CONFLICT');
  END IF;

  -- 6. Determinar a matriz
  SELECT COALESCE(parent_id, id) INTO v_matriz_id
  FROM barbershops
  WHERE id = p_barbershop_id;

  -- 7. Buscar cliente existente pelo telefone
  SELECT c.id INTO v_client_id
  FROM clients c
  WHERE c.phone = p_client_phone
    AND (c.barbershop_id = v_matriz_id OR c.barbershop_id IN (SELECT id FROM barbershops WHERE parent_id = v_matriz_id))
  LIMIT 1;

  -- 8. Se não encontrou, criar novo cliente
  IF v_client_id IS NULL THEN
    INSERT INTO clients (barbershop_id, name, phone, email, active, notification_enabled)
    VALUES (v_matriz_id, p_client_name, p_client_phone, p_client_email, true, true)
    RETURNING id INTO v_client_id;
  END IF;

  -- 9. Criar o agendamento
  INSERT INTO appointments (
    barbershop_id, client_id, staff_id, service_id,
    appointment_date, appointment_time, duration,
    status, client_name, client_phone, service_name, service_price
  ) VALUES (
    p_barbershop_id, v_client_id, p_staff_id, p_service_id,
    p_appointment_date, p_appointment_time, p_duration,
    'pendente', p_client_name, p_client_phone, p_service_name, p_service_price
  )
  RETURNING id INTO v_appointment_id;

  RETURN json_build_object('success', true, 'appointment_id', v_appointment_id, 'client_id', v_client_id);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_appointment(UUID, UUID, UUID, DATE, TIME, INTEGER, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.create_public_appointment IS 'Função RPC para criar agendamentos via página pública. Usa SECURITY DEFINER para bypass de RLS de forma segura.';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT routine_name, routine_type FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN ('get_occupied_slots', 'create_public_appointment');

SELECT schemaname, tablename, policyname, roles FROM pg_policies 
WHERE roles::text LIKE '%anon%' ORDER BY tablename;
