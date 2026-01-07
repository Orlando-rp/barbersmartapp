-- =====================================================
-- MIGRAÇÃO: Adicionar coluna chatbot_enabled na whatsapp_config
-- Execute este script no SQL Editor do Supabase/Lovable Cloud
-- =====================================================

-- 1. Adicionar coluna chatbot_enabled
ALTER TABLE public.whatsapp_config 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false;

-- 2. Comentário para documentação
COMMENT ON COLUMN public.whatsapp_config.chatbot_enabled IS 'Indica se o chatbot IA está ativado para esta barbearia';

-- 3. Migrar dados existentes do JSON config para a coluna
UPDATE public.whatsapp_config
SET chatbot_enabled = COALESCE((config->>'chatbot_enabled')::boolean, false)
WHERE chatbot_enabled IS NULL OR chatbot_enabled = false;

-- 4. Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config' 
ORDER BY ordinal_position;
