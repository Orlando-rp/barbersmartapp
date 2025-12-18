-- =====================================================
-- CORREÇÃO COMPLETA DO AGENDAMENTO PÚBLICO
-- =====================================================
-- Este script corrige todos os problemas de RLS e permissões
-- para o fluxo de agendamento público funcionar corretamente.
-- Execute TODO este script no Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- PARTE 1: RPC PARA BUSCAR HORÁRIOS OCUPADOS
-- =====================================================
-- Esta RPC permite que usuários anônimos vejam quais horários
-- estão ocupados sem expor dados sensíveis dos agendamentos.

DROP FUNCTION IF EXISTS public.get_occupied_slots;

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
  SELECT a.appointment_time, a.duration
  FROM appointments a
  WHERE a.barbershop_id = p_barbershop_id
    AND a.staff_id = p_staff_id
    AND a.appointment_date = p_date
    AND a.status NOT IN ('cancelado');
END;
$$;

-- Permitir execução por usuários anônimos e autenticados
GRANT EXECUTE ON FUNCTION public.get_occupied_slots TO anon, authenticated;

COMMENT ON FUNCTION public.get_occupied_slots IS 
'Retorna os horários ocupados de um profissional em uma data específica.
Usado pela página de agendamento público para verificar disponibilidade.
Usa SECURITY DEFINER para bypass de RLS de forma segura.';

-- =====================================================
-- PARTE 2: POLÍTICAS RLS PARA DADOS PÚBLICOS
-- =====================================================
-- Estas políticas permitem que usuários anônimos leiam
-- as informações necessárias para o agendamento público.

-- ----- BARBERSHOPS -----
-- Remover política existente se houver
DROP POLICY IF EXISTS "Anon can view active barbershops" ON public.barbershops;

-- Criar política para anon ver barbearias ativas
CREATE POLICY "Anon can view active barbershops"
ON public.barbershops
FOR SELECT TO anon
USING (active = true);

-- ----- SERVICES -----
DROP POLICY IF EXISTS "Anon can view active services" ON public.services;

CREATE POLICY "Anon can view active services"
ON public.services
FOR SELECT TO anon
USING (active = true);

-- ----- STAFF -----
DROP POLICY IF EXISTS "Anon can view active staff" ON public.staff;

CREATE POLICY "Anon can view active staff"
ON public.staff
FOR SELECT TO anon
USING (active = true);

-- ----- STAFF_UNITS -----
DROP POLICY IF EXISTS "Anon can view staff_units" ON public.staff_units;

-- Verificar se a tabela existe antes de criar a política
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_units') THEN
    EXECUTE 'CREATE POLICY "Anon can view staff_units" ON public.staff_units FOR SELECT TO anon USING (active = true)';
  END IF;
END $$;

-- ----- STAFF_SERVICES -----
DROP POLICY IF EXISTS "Anon can view staff_services" ON public.staff_services;

-- Verificar se a tabela existe antes de criar a política
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_services') THEN
    EXECUTE 'CREATE POLICY "Anon can view staff_services" ON public.staff_services FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- ----- BUSINESS_HOURS -----
DROP POLICY IF EXISTS "Anon can view business_hours" ON public.business_hours;

-- Verificar se a tabela existe antes de criar a política
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_hours') THEN
    EXECUTE 'CREATE POLICY "Anon can view business_hours" ON public.business_hours FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- ----- PROFILES -----
-- Permitir anon ver informações básicas de perfil (nome, avatar)
DROP POLICY IF EXISTS "Anon can view basic profile info" ON public.profiles;

CREATE POLICY "Anon can view basic profile info"
ON public.profiles
FOR SELECT TO anon
USING (true);

-- ----- SERVICE_CATEGORIES -----
DROP POLICY IF EXISTS "Anon can view service_categories" ON public.service_categories;

-- Verificar se a tabela existe antes de criar a política
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_categories') THEN
    EXECUTE 'CREATE POLICY "Anon can view service_categories" ON public.service_categories FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- ----- BARBERSHOP_DOMAINS -----
DROP POLICY IF EXISTS "Anon can view barbershop_domains" ON public.barbershop_domains;

-- Verificar se a tabela existe antes de criar a política
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershop_domains') THEN
    EXECUTE 'CREATE POLICY "Anon can view barbershop_domains" ON public.barbershop_domains FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- =====================================================
-- PARTE 3: ATUALIZAR RPC DE CRIAÇÃO DE AGENDAMENTO
-- =====================================================
-- Garantir que a RPC create_public_appointment está correta

DROP FUNCTION IF EXISTS public.create_public_appointment;

CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_barbershop_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_duration INTEGER,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_name TEXT,
  p_service_price DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_appointment_id UUID;
  v_matriz_id UUID;
  v_end_time TIME;
  v_conflict_count INTEGER;
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
  
  -- 4. Calcular horário de término do novo agendamento
  v_end_time := p_appointment_time + (p_duration || ' minutes')::INTERVAL;
  
  -- 5. Verificar conflito de horário para o mesmo profissional
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE staff_id = p_staff_id
    AND appointment_date = p_appointment_date
    AND status NOT IN ('cancelado')
    AND (
      -- Novo agendamento começa durante um existente
      (p_appointment_time >= appointment_time AND p_appointment_time < appointment_time + (duration || ' minutes')::INTERVAL)
      OR
      -- Novo agendamento termina durante um existente
      (v_end_time > appointment_time AND v_end_time <= appointment_time + (duration || ' minutes')::INTERVAL)
      OR
      -- Novo agendamento engloba um existente
      (p_appointment_time <= appointment_time AND v_end_time >= appointment_time + (duration || ' minutes')::INTERVAL)
    );
  
  IF v_conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Horário indisponível. O profissional já possui um agendamento neste horário.',
      'code', 'CONFLICT'
    );
  END IF;
  
  -- 6. Determinar a matriz (para associar o cliente)
  SELECT COALESCE(parent_id, id) INTO v_matriz_id
  FROM barbershops
  WHERE id = p_barbershop_id;
  
  -- 7. Buscar cliente existente pelo telefone (na hierarquia da barbearia)
  SELECT id INTO v_client_id
  FROM clients
  WHERE phone = p_client_phone
    AND barbershop_id IN (
      SELECT id FROM barbershops 
      WHERE id = v_matriz_id 
         OR parent_id = v_matriz_id
    )
  LIMIT 1;
  
  -- 8. Se não encontrou, criar novo cliente associado à matriz
  IF v_client_id IS NULL THEN
    INSERT INTO clients (
      barbershop_id,
      name,
      phone,
      active
    ) VALUES (
      v_matriz_id,
      p_client_name,
      p_client_phone,
      true
    )
    RETURNING id INTO v_client_id;
  END IF;
  
  -- 9. Criar o agendamento
  INSERT INTO appointments (
    barbershop_id,
    client_id,
    staff_id,
    service_id,
    appointment_date,
    appointment_time,
    duration,
    client_name,
    client_phone,
    service_name,
    service_price,
    status
  ) VALUES (
    p_barbershop_id,
    v_client_id,
    p_staff_id,
    p_service_id,
    p_appointment_date,
    p_appointment_time,
    p_duration,
    p_client_name,
    p_client_phone,
    p_service_name,
    p_service_price,
    'pendente'
  )
  RETURNING id INTO v_appointment_id;
  
  RETURN json_build_object(
    'success', true, 
    'appointment_id', v_appointment_id,
    'client_id', v_client_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Permitir que qualquer usuário (incluindo anon) execute a função
GRANT EXECUTE ON FUNCTION public.create_public_appointment TO anon, authenticated;

COMMENT ON FUNCTION public.create_public_appointment IS 
'Função RPC para criar agendamentos via página pública. 
Usa SECURITY DEFINER para bypass de RLS de forma segura.
Cria automaticamente o cliente se não existir pelo telefone.
Valida conflitos de horário para o mesmo profissional.';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute estas queries para verificar se tudo foi criado corretamente

-- Verificar funções RPC criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_occupied_slots', 'create_public_appointment');

-- Verificar políticas RLS para anon
SELECT 
  schemaname,
  tablename,
  policyname,
  roles
FROM pg_policies 
WHERE roles::text LIKE '%anon%'
ORDER BY tablename;
