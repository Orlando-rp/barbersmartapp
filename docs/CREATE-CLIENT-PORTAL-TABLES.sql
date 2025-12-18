-- =====================================================
-- CLIENT PORTAL INFRASTRUCTURE
-- =====================================================
-- Este script cria a infraestrutura necessária para o
-- Portal do Cliente, incluindo tabelas, roles e RLS
-- =====================================================

-- 1. Adicionar role 'cliente' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Criar tabela client_users (vincula auth.users a clients)
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(client_id)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);

-- 4. Habilitar RLS na tabela client_users
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- 5. Função para obter client_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id 
  FROM client_users 
  WHERE user_id = p_user_id
  LIMIT 1;
$$;

-- 6. Função para verificar se usuário é cliente
CREATE OR REPLACE FUNCTION public.is_client(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = p_user_id 
    AND role = 'cliente'
  );
$$;

-- 7. Função para obter barbershop_id do cliente
CREATE OR REPLACE FUNCTION public.get_client_barbershop_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.barbershop_id 
  FROM clients c
  INNER JOIN client_users cu ON cu.client_id = c.id
  WHERE cu.user_id = p_user_id
  LIMIT 1;
$$;

-- =====================================================
-- RLS POLICIES PARA client_users
-- =====================================================

-- Cliente pode ver seu próprio vínculo
CREATE POLICY "client_users_select_own" ON client_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admin pode ver todos
CREATE POLICY "client_users_select_super_admin" ON client_users
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Admin da barbearia pode ver clientes vinculados à sua barbearia
CREATE POLICY "client_users_select_barbershop_admin" ON client_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = client_users.client_id
      AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), c.barbershop_id)
    )
  );

-- Sistema pode inserir (via Edge Function)
CREATE POLICY "client_users_insert_system" ON client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES PARA clients (acesso do cliente)
-- =====================================================

-- Cliente pode ver seu próprio registro
DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- Cliente pode atualizar seu próprio registro
DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE
  TO authenticated
  USING (
    id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  )
  WITH CHECK (
    id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- =====================================================
-- RLS POLICIES PARA appointments (acesso do cliente)
-- =====================================================

-- Cliente pode ver seus próprios agendamentos
DROP POLICY IF EXISTS "appointments_select_client" ON appointments;
CREATE POLICY "appointments_select_client" ON appointments
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- Cliente pode cancelar seus próprios agendamentos (update status)
DROP POLICY IF EXISTS "appointments_update_client" ON appointments;
CREATE POLICY "appointments_update_client" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  )
  WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- Cliente pode criar agendamentos
DROP POLICY IF EXISTS "appointments_insert_client" ON appointments;
CREATE POLICY "appointments_insert_client" ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- =====================================================
-- RLS POLICIES PARA reviews (acesso do cliente)
-- =====================================================

-- Cliente pode ver suas próprias avaliações
DROP POLICY IF EXISTS "reviews_select_client" ON reviews;
CREATE POLICY "reviews_select_client" ON reviews
  FOR SELECT
  TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- Cliente pode criar avaliações
DROP POLICY IF EXISTS "reviews_insert_client" ON reviews;
CREATE POLICY "reviews_insert_client" ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- Cliente pode atualizar suas próprias avaliações
DROP POLICY IF EXISTS "reviews_update_client" ON reviews;
CREATE POLICY "reviews_update_client" ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  )
  WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- =====================================================
-- RLS POLICIES PARA whatsapp_messages (acesso do cliente)
-- =====================================================

-- Cliente pode ver mensagens enviadas para ele
DROP POLICY IF EXISTS "whatsapp_messages_select_client" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_client" ON whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (
    recipient_phone IN (
      SELECT phone FROM clients WHERE id = public.get_client_id_for_user(auth.uid())
    )
    OR public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

-- =====================================================
-- GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_client_id_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_barbershop_id TO authenticated;

-- =====================================================
-- TRIGGER para updated_at
-- =====================================================

CREATE OR REPLACE TRIGGER set_client_users_updated_at
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
