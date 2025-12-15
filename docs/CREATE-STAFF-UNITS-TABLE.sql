-- ===============================================
-- CRIAR TABELA STAFF_UNITS PARA MULTI-UNIDADE
-- ===============================================
-- Este script implementa o novo modelo onde:
-- - staff: cadastro do profissional na MATRIZ (dados básicos)
-- - staff_units: vínculo do profissional com UNIDADES específicas (configurações por unidade)
-- ===============================================

-- ===============================================
-- PASSO 1: CRIAR TABELA STAFF_UNITS
-- ===============================================

CREATE TABLE IF NOT EXISTS staff_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  commission_rate decimal(5,2) DEFAULT 0,
  schedule jsonb DEFAULT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (staff_id, barbershop_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_staff_units_staff_id ON staff_units(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_units_barbershop_id ON staff_units(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_units_active ON staff_units(active);

-- ===============================================
-- PASSO 2: HABILITAR RLS
-- ===============================================

ALTER TABLE staff_units ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver staff_units de suas barbearias
CREATE POLICY "Users can view staff_units from their barbershops"
ON staff_units FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_barbershops ub 
    WHERE ub.user_id = auth.uid() 
    AND ub.barbershop_id = staff_units.barbershop_id
  )
  OR 
  public.is_super_admin(auth.uid())
);

-- Política INSERT: admins podem adicionar staff_units
CREATE POLICY "Admins can insert staff_units"
ON staff_units FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND (ur.barbershop_id = staff_units.barbershop_id OR ur.role = 'super_admin')
  )
);

-- Política UPDATE: admins podem atualizar staff_units
CREATE POLICY "Admins can update staff_units"
ON staff_units FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND (ur.barbershop_id = staff_units.barbershop_id OR ur.role = 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND (ur.barbershop_id = staff_units.barbershop_id OR ur.role = 'super_admin')
  )
);

-- Política DELETE: admins podem remover staff_units
CREATE POLICY "Admins can delete staff_units"
ON staff_units FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND (ur.barbershop_id = staff_units.barbershop_id OR ur.role = 'super_admin')
  )
);

-- Política para staff editar próprios dados
CREATE POLICY "Staff can update own unit data"
ON staff_units FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_units.staff_id
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_units.staff_id
    AND s.user_id = auth.uid()
  )
);

-- ===============================================
-- PASSO 3: TRIGGER PARA UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_staff_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_units_updated_at ON staff_units;
CREATE TRIGGER trigger_staff_units_updated_at
  BEFORE UPDATE ON staff_units
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_units_updated_at();

-- ===============================================
-- PASSO 4: FUNÇÕES AUXILIARES
-- ===============================================

-- Função para obter unidades onde um staff trabalha
CREATE OR REPLACE FUNCTION get_staff_units(p_staff_id uuid)
RETURNS TABLE (
  unit_id uuid,
  unit_name text,
  commission_rate decimal,
  schedule jsonb,
  active boolean
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    su.barbershop_id as unit_id,
    b.name as unit_name,
    su.commission_rate,
    su.schedule,
    su.active
  FROM staff_units su
  JOIN barbershops b ON b.id = su.barbershop_id
  WHERE su.staff_id = p_staff_id
  AND su.active = true
  ORDER BY b.name;
$$;

-- Função para obter staff de uma unidade
CREATE OR REPLACE FUNCTION get_unit_staff(p_barbershop_id uuid)
RETURNS TABLE (
  staff_id uuid,
  user_id uuid,
  full_name text,
  commission_rate decimal,
  schedule jsonb,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id as staff_id,
    s.user_id,
    p.full_name,
    COALESCE(su.commission_rate, s.commission_rate) as commission_rate,
    COALESCE(su.schedule, s.schedule) as schedule,
    COALESCE(su.active, s.active) as active
  FROM staff s
  JOIN profiles p ON p.id = s.user_id
  LEFT JOIN staff_units su ON su.staff_id = s.id AND su.barbershop_id = p_barbershop_id
  WHERE s.active = true
  AND (su.barbershop_id = p_barbershop_id OR su.id IS NULL)
  ORDER BY p.full_name;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_staff_units(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unit_staff(uuid) TO authenticated;

-- ===============================================
-- PASSO 5: MIGRAR DADOS EXISTENTES
-- ===============================================
-- Este passo deve ser executado APÓS a reorganização da hierarquia

-- Migrar dados de staff duplicados para staff_units
-- (quando um staff tem múltiplos registros para diferentes barbershops)

DO $$
DECLARE
  v_matriz_id uuid;
  v_user_record RECORD;
  v_staff_record RECORD;
  v_primary_staff_id uuid;
BEGIN
  -- Encontrar a matriz (barbearia sem parent_id que tem unidades)
  SELECT id INTO v_matriz_id
  FROM barbershops
  WHERE parent_id IS NULL
  AND EXISTS (SELECT 1 FROM barbershops b2 WHERE b2.parent_id = barbershops.id)
  LIMIT 1;

  IF v_matriz_id IS NULL THEN
    RAISE NOTICE 'Nenhuma matriz com unidades encontrada. Migração não necessária.';
    RETURN;
  END IF;

  RAISE NOTICE 'Matriz encontrada: %', v_matriz_id;

  -- Para cada user_id que tem múltiplos registros de staff
  FOR v_user_record IN 
    SELECT user_id, COUNT(*) as cnt
    FROM staff
    WHERE active = true
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Processando user_id: % com % registros', v_user_record.user_id, v_user_record.cnt;

    -- Verificar se já existe registro na matriz
    SELECT id INTO v_primary_staff_id
    FROM staff
    WHERE user_id = v_user_record.user_id
    AND barbershop_id = v_matriz_id
    AND active = true;

    -- Se não existe na matriz, criar
    IF v_primary_staff_id IS NULL THEN
      -- Pegar dados do primeiro registro existente
      SELECT * INTO v_staff_record
      FROM staff
      WHERE user_id = v_user_record.user_id
      AND active = true
      ORDER BY created_at
      LIMIT 1;

      -- Inserir na matriz
      INSERT INTO staff (barbershop_id, user_id, commission_rate, schedule, active, specialties)
      VALUES (v_matriz_id, v_user_record.user_id, v_staff_record.commission_rate, v_staff_record.schedule, true, v_staff_record.specialties)
      RETURNING id INTO v_primary_staff_id;

      RAISE NOTICE 'Criado staff na matriz: %', v_primary_staff_id;
    END IF;

    -- Migrar todos os outros registros para staff_units
    FOR v_staff_record IN
      SELECT s.id, s.barbershop_id, s.commission_rate, s.schedule, s.active
      FROM staff s
      JOIN barbershops b ON b.id = s.barbershop_id
      WHERE s.user_id = v_user_record.user_id
      AND s.id != v_primary_staff_id
      AND b.parent_id = v_matriz_id  -- Apenas unidades da matriz
    LOOP
      -- Inserir em staff_units se não existir
      INSERT INTO staff_units (staff_id, barbershop_id, commission_rate, schedule, active)
      VALUES (v_primary_staff_id, v_staff_record.barbershop_id, v_staff_record.commission_rate, v_staff_record.schedule, v_staff_record.active)
      ON CONFLICT (staff_id, barbershop_id) DO UPDATE SET
        commission_rate = EXCLUDED.commission_rate,
        schedule = EXCLUDED.schedule,
        active = EXCLUDED.active,
        updated_at = now();

      RAISE NOTICE 'Migrado para staff_units: staff_id=%, barbershop_id=%', v_primary_staff_id, v_staff_record.barbershop_id;

      -- Desativar o registro antigo de staff (não deletar para manter histórico)
      UPDATE staff SET active = false WHERE id = v_staff_record.id;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migração concluída!';
END $$;

-- ===============================================
-- PASSO 6: VERIFICAR MIGRAÇÃO
-- ===============================================

-- Verificar estrutura
SELECT 'staff_units criada' as status, COUNT(*) as registros FROM staff_units;

-- Verificar staff na matriz
SELECT 
  s.id as staff_id,
  p.full_name,
  b.name as barbershop_name,
  s.active,
  (SELECT COUNT(*) FROM staff_units su WHERE su.staff_id = s.id) as unidades_vinculadas
FROM staff s
JOIN profiles p ON p.id = s.user_id
JOIN barbershops b ON b.id = s.barbershop_id
WHERE s.active = true
ORDER BY p.full_name;

-- Verificar staff_units
SELECT 
  su.id,
  p.full_name as staff_name,
  b.name as unit_name,
  su.commission_rate,
  su.active
FROM staff_units su
JOIN staff s ON s.id = su.staff_id
JOIN profiles p ON p.id = s.user_id
JOIN barbershops b ON b.id = su.barbershop_id
ORDER BY p.full_name, b.name;
