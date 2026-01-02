-- =====================================================
-- MIGRAÇÃO: Sistema de Agendamento Recorrente
-- Adiciona suporte para agendamentos recorrentes e múltiplas datas
-- =====================================================

-- 1. Adicionar colunas na tabela appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_group_id uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_index integer DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS original_date date;

-- 2. Criar índice para consultas de recorrência
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_group 
ON appointments(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_recurring 
ON appointments(is_recurring) WHERE is_recurring = true;

-- 3. Comentários para documentação
COMMENT ON COLUMN appointments.recurrence_group_id IS 'UUID que agrupa todos os agendamentos da mesma série recorrente';
COMMENT ON COLUMN appointments.recurrence_rule IS 'Regra de recorrência: weekly, biweekly, triweekly, monthly, custom:{days}';
COMMENT ON COLUMN appointments.is_recurring IS 'Flag para identificar se faz parte de uma série recorrente';
COMMENT ON COLUMN appointments.recurrence_index IS 'Posição do agendamento na série (0 = primeiro, 1 = segundo, etc)';
COMMENT ON COLUMN appointments.original_date IS 'Data original do agendamento caso tenha sido remarcado individualmente';

-- 4. Função para buscar todos os agendamentos de uma série
CREATE OR REPLACE FUNCTION get_recurring_appointments(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  appointment_date date,
  appointment_time time,
  status text,
  recurrence_index integer,
  is_rescheduled boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.recurrence_index,
    (a.original_date IS NOT NULL AND a.original_date != a.appointment_date) as is_rescheduled
  FROM appointments a
  WHERE a.recurrence_group_id = p_group_id
  ORDER BY a.recurrence_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para cancelar múltiplos agendamentos de uma série
CREATE OR REPLACE FUNCTION cancel_recurring_appointments(
  p_group_id uuid,
  p_cancel_scope text, -- 'single', 'future', 'all'
  p_from_index integer DEFAULT 0
)
RETURNS integer AS $$
DECLARE
  cancelled_count integer := 0;
BEGIN
  IF p_cancel_scope = 'all' THEN
    UPDATE appointments
    SET status = 'cancelado', updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND status NOT IN ('cancelado', 'concluido');
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  ELSIF p_cancel_scope = 'future' THEN
    UPDATE appointments
    SET status = 'cancelado', updated_at = now()
    WHERE recurrence_group_id = p_group_id
      AND recurrence_index >= p_from_index
      AND status NOT IN ('cancelado', 'concluido');
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  END IF;
  
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_recurring_appointments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_recurring_appointments(uuid, text, integer) TO authenticated;

-- 7. Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Migração de agendamento recorrente concluída!';
  RAISE NOTICE 'Novas colunas: recurrence_group_id, recurrence_rule, is_recurring, recurrence_index, original_date';
  RAISE NOTICE 'Novas funções: get_recurring_appointments, cancel_recurring_appointments';
END $$;
