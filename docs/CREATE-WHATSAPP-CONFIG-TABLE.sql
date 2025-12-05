-- =============================================
-- WHATSAPP CONFIG TABLE SETUP
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Criar tabela whatsapp_config
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'evolution')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id, provider)
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_barbershop ON whatsapp_config(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_provider ON whatsapp_config(provider);

-- 3. Habilitar RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Users can view their barbershop config"
  ON whatsapp_config FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their barbershop config"
  ON whatsapp_config FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their barbershop config"
  ON whatsapp_config FOR UPDATE
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_config_updated_at();

-- 6. Adicionar coluna provider à tabela whatsapp_logs (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE whatsapp_logs ADD COLUMN provider TEXT DEFAULT 'meta' CHECK (provider IN ('meta', 'evolution'));
  END IF;
END $$;

-- 7. Criar índice para provider em whatsapp_logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_provider ON whatsapp_logs(provider);

-- 8. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON whatsapp_config TO authenticated;

-- =============================================
-- CONFIG JSONB STRUCTURE
-- =============================================
-- 
-- Para Meta (API Oficial):
-- {
--   "phone_number_id": "123456789",
--   "access_token": "EAAxxxxxxx..."
-- }
--
-- Para Evolution API:
-- {
--   "api_url": "https://api.evolution.seudominio.com",
--   "api_key": "sua-api-key",
--   "instance_name": "barbersmart-001",
--   "connection_status": "connected" | "disconnected" | "connecting"
-- }
-- =============================================
