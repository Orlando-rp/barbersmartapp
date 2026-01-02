-- =============================================
-- WHATSAPP CONFIG HEALTH COLUMNS
-- Execute este script no Supabase SQL Editor
-- Adiciona colunas para rastreamento de saúde da conexão
-- =============================================

-- 1. Adicionar colunas de health check
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unknown' 
  CHECK (health_status IN ('connected', 'disconnected', 'unknown', 'error'));

-- 2. Índice para busca rápida de configs ativas com Evolution
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active_evolution 
ON whatsapp_config(barbershop_id) 
WHERE is_active = true AND provider = 'evolution';

-- 3. Índice para health status
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_health 
ON whatsapp_config(health_status) 
WHERE provider = 'evolution';

-- 4. Comentários para documentação
COMMENT ON COLUMN whatsapp_config.last_health_check IS 'Última verificação de saúde da conexão';
COMMENT ON COLUMN whatsapp_config.health_status IS 'Status atual da conexão: connected, disconnected, unknown, error';

-- =============================================
-- VERIFICAR RESULTADO
-- =============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;
