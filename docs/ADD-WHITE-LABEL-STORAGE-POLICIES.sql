-- =====================================================
-- CONFIGURAÇÃO DE STORAGE PARA WHITE-LABEL
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar bucket público para assets de branding (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets', 
  'public-assets', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon'];

-- 2. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Public can view assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to own barbershop folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own barbershop assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own barbershop assets" ON storage.objects;

-- 3. Política de leitura pública (bucket é público)
CREATE POLICY "Public can view assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- 4. Política de upload para usuários autenticados em pasta da barbearia
CREATE POLICY "Authenticated users can upload to own barbershop folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public-assets' AND
  -- Verifica se o caminho começa com o ID de uma barbearia do usuário
  EXISTS (
    SELECT 1 FROM user_barbershops ub
    WHERE ub.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ub.barbershop_id::text
  )
);

-- 5. Política de atualização para usuários autenticados
CREATE POLICY "Users can update own barbershop assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM user_barbershops ub
    WHERE ub.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ub.barbershop_id::text
  )
);

-- 6. Política de exclusão para usuários autenticados
CREATE POLICY "Users can delete own barbershop assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM user_barbershops ub
    WHERE ub.user_id = auth.uid()
    AND (storage.foldername(name))[1] = ub.barbershop_id::text
  )
);

-- 7. Adicionar coluna custom_branding na tabela barbershops (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'custom_branding'
  ) THEN
    ALTER TABLE barbershops ADD COLUMN custom_branding JSONB DEFAULT NULL;
    COMMENT ON COLUMN barbershops.custom_branding IS 'Configurações de branding personalizadas para clientes white-label';
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute para verificar se tudo foi criado corretamente:

-- SELECT * FROM storage.buckets WHERE id = 'public-assets';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'custom_branding';
