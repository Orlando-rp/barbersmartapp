-- =============================================
-- ADICIONAR COLUNA DE SUGESTÃO DE REAGENDAMENTO
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Adicionar coluna para rastrear quando a sugestão foi enviada
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reschedule_suggested_at TIMESTAMPTZ;

-- 2. Comentário na coluna
COMMENT ON COLUMN appointments.reschedule_suggested_at IS 'Data/hora em que a sugestão de reagendamento foi enviada ao cliente após não comparecimento';

-- 3. Criar índice para consultas de no-show sem sugestão enviada
CREATE INDEX IF NOT EXISTS idx_appointments_noshow_not_suggested 
ON appointments(status, reschedule_suggested_at) 
WHERE status = 'falta' AND reschedule_suggested_at IS NULL;

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- Após executar, verifique se a coluna foi criada:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'appointments' AND column_name = 'reschedule_suggested_at';
