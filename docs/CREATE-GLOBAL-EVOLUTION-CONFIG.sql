-- =============================================
-- GLOBAL EVOLUTION CONFIG TABLE SETUP
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Criar tabela para configurações globais do sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 3. Criar política RLS para super admins
CREATE POLICY "Super admins can manage system config"
  ON system_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_updated_at();

-- 5. Grant permissions
GRANT ALL ON system_config TO authenticated;

-- =============================================
-- EXEMPLO DE USO
-- =============================================
-- 
-- INSERT INTO system_config (key, value)
-- VALUES ('evolution_api', '{"api_url": "https://...", "api_key": "xxx"}')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- =============================================
