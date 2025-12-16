-- =============================================
-- CREATE ROLE PERMISSIONS TABLE
-- Sistema de permissões configuráveis por role
-- =============================================

-- Criar tabela role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('barbeiro', 'recepcionista')),
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, role)
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem permissões da própria barbearia
CREATE POLICY "Admins can manage role_permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_admin_of_barbershop(auth.uid(), barbershop_id)
  OR public.is_super_admin(auth.uid())
);

-- Política para usuários visualizarem permissões da própria barbearia
CREATE POLICY "Users can view own barbershop permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (public.user_belongs_to_barbershop(auth.uid(), barbershop_id));

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_barbershop_role 
ON public.role_permissions(barbershop_id, role);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION update_role_permissions_updated_at();

-- Comentários
COMMENT ON TABLE public.role_permissions IS 'Configurações de permissões por role por barbearia';
COMMENT ON COLUMN public.role_permissions.permissions IS 'JSONB com permissões habilitadas/desabilitadas para o role';

-- =============================================
-- ESTRUTURA DO JSONB permissions
-- =============================================
-- {
--   "dashboard": true,
--   "appointments": true,
--   "appointments_create": true,
--   "appointments_edit": true,
--   "appointments_delete": false,
--   "waitlist": true,
--   "clients": true,
--   "clients_create": true,
--   "clients_edit": true,
--   "services": true,
--   "staff": false,
--   "finance": false,
--   "meus_ganhos": true,
--   "reports": false,
--   "marketing": false,
--   "reviews": false,
--   "whatsapp": false,
--   "whatsapp_chat": false,
--   "chatbot": false,
--   "business_hours": false,
--   "audit": false,
--   "settings": true
-- }
