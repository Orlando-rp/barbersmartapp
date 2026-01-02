-- =====================================================
-- MIGRAÇÃO: Pausar Séries Recorrentes
-- Adiciona suporte para pausar/retomar séries recorrentes
-- =====================================================

-- 1. Adicionar coluna de pausa na tabela appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paused_until date;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pause_reason text;

-- 2. Criar índice para consultas de pausados
CREATE INDEX IF NOT EXISTS idx_appointments_paused 
ON appointments(is_paused) WHERE is_paused = true;

-- 3. Comentários para documentação
COMMENT ON COLUMN appointments.is_paused IS 'Flag para identificar se o agendamento está pausado temporariamente';
COMMENT ON COLUMN appointments.paused_at IS 'Data/hora em que o agendamento foi pausado';
COMMENT ON COLUMN appointments.paused_until IS 'Data até quando o agendamento está pausado (opcional)';
COMMENT ON COLUMN appointments.pause_reason IS 'Motivo da pausa (ex: cliente viajando, férias)';

-- 4. Função para pausar agendamentos de uma série
CREATE OR REPLACE FUNCTION pause_recurring_appointments(
  p_group_id uuid,
  p_pause_scope text, -- 'single', 'future', 'all'
  p_from_index integer DEFAULT 0,
  p_until_date date DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  paused_count integer := 0;
BEGIN
  IF p_pause_scope = 'all' THEN
    UPDATE appointments
    SET 
      is_paused = true, 
      paused_at = now(),
      paused_until = p_until_date,
      pause_reason = p_reason,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND status NOT IN ('cancelado', 'concluido')
      AND is_paused = false;
    GET DIAGNOSTICS paused_count = ROW_COUNT;
  ELSIF p_pause_scope = 'future' THEN
    UPDATE appointments
    SET 
      is_paused = true, 
      paused_at = now(),
      paused_until = p_until_date,
      pause_reason = p_reason,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND recurrence_index >= p_from_index
      AND status NOT IN ('cancelado', 'concluido')
      AND is_paused = false;
    GET DIAGNOSTICS paused_count = ROW_COUNT;
  ELSIF p_pause_scope = 'single' THEN
    UPDATE appointments
    SET 
      is_paused = true, 
      paused_at = now(),
      paused_until = p_until_date,
      pause_reason = p_reason,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND recurrence_index = p_from_index
      AND status NOT IN ('cancelado', 'concluido')
      AND is_paused = false;
    GET DIAGNOSTICS paused_count = ROW_COUNT;
  END IF;
  
  RETURN paused_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para retomar agendamentos pausados
CREATE OR REPLACE FUNCTION resume_recurring_appointments(
  p_group_id uuid,
  p_resume_scope text, -- 'single', 'future', 'all'
  p_from_index integer DEFAULT 0
)
RETURNS integer AS $$
DECLARE
  resumed_count integer := 0;
BEGIN
  IF p_resume_scope = 'all' THEN
    UPDATE appointments
    SET 
      is_paused = false, 
      paused_at = NULL,
      paused_until = NULL,
      pause_reason = NULL,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND is_paused = true;
    GET DIAGNOSTICS resumed_count = ROW_COUNT;
  ELSIF p_resume_scope = 'future' THEN
    UPDATE appointments
    SET 
      is_paused = false, 
      paused_at = NULL,
      paused_until = NULL,
      pause_reason = NULL,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND recurrence_index >= p_from_index
      AND is_paused = true;
    GET DIAGNOSTICS resumed_count = ROW_COUNT;
  ELSIF p_resume_scope = 'single' THEN
    UPDATE appointments
    SET 
      is_paused = false, 
      paused_at = NULL,
      paused_until = NULL,
      pause_reason = NULL,
      updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND recurrence_index = p_from_index
      AND is_paused = true;
    GET DIAGNOSTICS resumed_count = ROW_COUNT;
  END IF;
  
  RETURN resumed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION pause_recurring_appointments(uuid, text, integer, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION resume_recurring_appointments(uuid, text, integer) TO authenticated;

-- 7. Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Migração de pausa de séries recorrentes concluída!';
  RAISE NOTICE 'Novas colunas: is_paused, paused_at, paused_until, pause_reason';
  RAISE NOTICE 'Novas funções: pause_recurring_appointments, resume_recurring_appointments';
END $$;
