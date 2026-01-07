-- ============================================================
-- MIGRATION: Adicionar coluna chatbot_enabled ao whatsapp_config
-- Execute no Lovable Cloud antes de importar dados
-- ============================================================

-- Adicionar coluna chatbot_enabled
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false;

-- Verificar se foi adicionada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;
