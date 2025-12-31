-- =====================================================
-- MIGRAÇÃO: Adicionar campos de logo light/dark no system_branding
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar colunas para logos específicos por tema
ALTER TABLE system_branding 
ADD COLUMN IF NOT EXISTS logo_light_url text,
ADD COLUMN IF NOT EXISTS logo_dark_url text;

-- =====================================================
-- VERIFICAÇÃO: Execute para confirmar que foi criado
-- =====================================================
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'system_branding' 
-- AND column_name IN ('logo_light_url', 'logo_dark_url');
