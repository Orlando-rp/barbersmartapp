-- =====================================================
-- STAFF SERVICES TABLE - Serviços por Barbeiro
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela staff_services (relacionamento N:N)
CREATE TABLE IF NOT EXISTS staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_active ON staff_services(is_active);

-- 3. Habilitar RLS
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS

-- Leitura: usuários podem ver serviços de staff da sua barbearia
CREATE POLICY "Users can view staff services from their barbershop"
ON staff_services FOR SELECT
TO authenticated
USING (
  staff_id IN (
    SELECT s.id FROM staff s
    WHERE s.barbershop_id IN (
      SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
);

-- Inserção: apenas admins podem adicionar serviços ao staff
CREATE POLICY "Admins can insert staff services"
ON staff_services FOR INSERT
TO authenticated
WITH CHECK (
  staff_id IN (
    SELECT s.id FROM staff s
    WHERE s.barbershop_id IN (
      SELECT ur.barbershop_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  )
);

-- Atualização: apenas admins podem atualizar
CREATE POLICY "Admins can update staff services"
ON staff_services FOR UPDATE
TO authenticated
USING (
  staff_id IN (
    SELECT s.id FROM staff s
    WHERE s.barbershop_id IN (
      SELECT ur.barbershop_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  )
);

-- Deleção: apenas admins podem deletar
CREATE POLICY "Admins can delete staff services"
ON staff_services FOR DELETE
TO authenticated
USING (
  staff_id IN (
    SELECT s.id FROM staff s
    WHERE s.barbershop_id IN (
      SELECT ur.barbershop_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  )
);

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_staff_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_services_updated_at
  BEFORE UPDATE ON staff_services
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_services_updated_at();

-- 6. Permissões
GRANT SELECT ON staff_services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON staff_services TO authenticated;

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para obter serviços de um staff member
CREATE OR REPLACE FUNCTION get_staff_services(_staff_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service_id 
  FROM staff_services 
  WHERE staff_id = _staff_id 
  AND is_active = true
$$;

-- Função para obter staff members que atendem um serviço
CREATE OR REPLACE FUNCTION get_service_staff(_service_id UUID, _barbershop_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.staff_id 
  FROM staff_services ss
  JOIN staff s ON ss.staff_id = s.id
  WHERE ss.service_id = _service_id 
  AND ss.is_active = true
  AND s.barbershop_id = _barbershop_id
  AND s.active = true
$$;

-- Função para verificar se staff atende um serviço
CREATE OR REPLACE FUNCTION staff_provides_service(_staff_id UUID, _service_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM staff_services 
    WHERE staff_id = _staff_id 
    AND service_id = _service_id 
    AND is_active = true
  )
$$;

GRANT EXECUTE ON FUNCTION get_staff_services TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_staff TO authenticated;
GRANT EXECUTE ON FUNCTION staff_provides_service TO authenticated;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute após criar a tabela:
-- SELECT * FROM staff_services LIMIT 1;
-- SELECT get_staff_services('some-staff-uuid');
