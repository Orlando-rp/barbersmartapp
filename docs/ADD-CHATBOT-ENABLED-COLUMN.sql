-- =====================================================
-- MIGRAÇÃO: Adicionar coluna chatbot_enabled na whatsapp_config
-- Execute este script no SQL Editor do Supabase/Lovable Cloud
-- =====================================================

-- Adicionar coluna chatbot_enabled
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN whatsapp_config.chatbot_enabled IS 'Indica se o chatbot IA está ativado para esta barbearia';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config' 
ORDER BY ordinal_position;
