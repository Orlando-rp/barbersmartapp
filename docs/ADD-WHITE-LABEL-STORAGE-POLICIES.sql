-- =====================================================
-- CORREÇÃO COMPLETA DO STORAGE PARA WHITE-LABEL
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets', 
  'public-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/gif'];

-- 2. Remover TODAS as políticas existentes do bucket public-assets
DROP POLICY IF EXISTS "Public can view assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to own barbershop folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own barbershop assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own barbershop assets" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert public-assets" ON storage.objects;

-- 3. Criar política de leitura pública
CREATE POLICY "Public read access public-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- 4. Criar política de INSERT para usuários autenticados
CREATE POLICY "Authenticated can insert public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- 5. Criar política de UPDATE para usuários autenticados
CREATE POLICY "Authenticated can update public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- 6. Criar política de DELETE para usuários autenticados
CREATE POLICY "Authenticated can delete public-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');

-- =====================================================
-- VERIFICAÇÃO
-- Execute para confirmar que tudo foi criado:
-- =====================================================
-- SELECT * FROM storage.buckets WHERE id = 'public-assets';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
