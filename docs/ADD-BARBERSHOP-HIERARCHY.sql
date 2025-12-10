-- ============================================
-- HIERARQUIA DE BARBEARIAS (Matriz/Unidades)
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar coluna parent_id para hierarquia
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES barbershops(id) ON DELETE SET NULL;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_barbershops_parent_id ON barbershops(parent_id);

-- 3. Função para verificar se é matriz (não tem parent_id)
CREATE OR REPLACE FUNCTION is_headquarters(barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT parent_id IS NULL
  FROM barbershops
  WHERE id = barbershop_id;
$$;

-- 4. Função para contar unidades de uma matriz
CREATE OR REPLACE FUNCTION count_units(headquarters_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM barbershops
  WHERE parent_id = headquarters_id;
$$;

-- 5. Comentários nas colunas
COMMENT ON COLUMN barbershops.parent_id IS 'ID da barbearia matriz. NULL indica que é uma matriz.';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Após executar, verifique:
-- SELECT id, name, parent_id, is_headquarters(id) as is_hq FROM barbershops;
