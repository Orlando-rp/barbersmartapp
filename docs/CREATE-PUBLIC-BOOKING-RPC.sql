-- RPC para criar agendamento público (SECURITY DEFINER)
-- Permite que usuários não autenticados criem agendamentos de forma segura
-- Cria automaticamente o cliente se não existir
-- Valida conflitos de horário para evitar agendamentos duplicados

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.create_public_appointment;

-- Criar a função RPC
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

-- Comentário explicativo
COMMENT ON FUNCTION public.create_public_appointment IS 
'Função RPC para criar agendamentos via página pública. 
Usa SECURITY DEFINER para bypass de RLS de forma segura.
Cria automaticamente o cliente se não existir pelo telefone.
Valida conflitos de horário para o mesmo profissional.';
