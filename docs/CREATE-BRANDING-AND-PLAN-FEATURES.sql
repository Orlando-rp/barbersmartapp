-- =====================================================
-- MIGRAÇÃO: Sistema de Branding e Feature Flags dos Planos
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar coluna feature_flags na tabela subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS feature_flags jsonb DEFAULT '{
  "whatsapp_notifications": true,
  "whatsapp_chatbot": false,
  "marketing_campaigns": false,
  "marketing_coupons": false,
  "advanced_reports": false,
  "predictive_analytics": false,
  "multi_unit": false,
  "white_label": false,
  "priority_support": false
}'::jsonb;

-- 2. Criar tabela system_branding para configurações globais
CREATE TABLE IF NOT EXISTS system_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name text NOT NULL DEFAULT 'BarberSmart',
  tagline text DEFAULT 'Gestão Inteligente para Barbearias',
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#d4a574',
  secondary_color text DEFAULT '#1a1a2e',
  accent_color text DEFAULT '#c9a86c',
  allow_tenant_customization boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Habilitar RLS na tabela system_branding
ALTER TABLE system_branding ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para system_branding
-- Super admins podem fazer tudo
CREATE POLICY "Super admins can manage branding"
ON system_branding
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Leitura pública para todos (necessário para aplicar branding)
CREATE POLICY "Anyone can view branding"
ON system_branding
FOR SELECT
TO authenticated
USING (true);

-- 5. Adicionar coluna custom_branding nas barbearias (para white-label)
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS custom_branding jsonb DEFAULT NULL;

-- 6. Criar bucket de storage para assets públicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Políticas de storage para public-assets
-- Leitura pública
CREATE POLICY "Public read access for assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Super admins podem fazer upload
CREATE POLICY "Super admins can upload assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Super admins podem atualizar
CREATE POLICY "Super admins can update assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Super admins podem deletar
CREATE POLICY "Super admins can delete assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- 8. Inserir registro padrão de branding
INSERT INTO system_branding (system_name, tagline, primary_color, secondary_color, accent_color)
VALUES ('BarberSmart', 'Gestão Inteligente para Barbearias', '#d4a574', '#1a1a2e', '#c9a86c')
ON CONFLICT DO NOTHING;

-- 9. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_system_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_system_branding_updated_at ON system_branding;
CREATE TRIGGER trigger_update_system_branding_updated_at
  BEFORE UPDATE ON system_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_system_branding_updated_at();

-- =====================================================
-- VERIFICAÇÃO: Execute para confirmar que tudo foi criado
-- =====================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'feature_flags';
-- SELECT * FROM system_branding;
-- SELECT * FROM storage.buckets WHERE id = 'public-assets';
