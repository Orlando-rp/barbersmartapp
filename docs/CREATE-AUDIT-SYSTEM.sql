-- ===============================================
-- SISTEMA DE AUDITORIA - BarberSmart
-- ===============================================
-- Rastreia todas as alterações críticas no banco de dados
-- Captura: quem alterou, quando, o que mudou
-- ===============================================

-- ===== 1. CRIAR ENUM PARA TIPOS DE OPERAÇÃO =====
CREATE TYPE public.audit_operation AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);

-- ===== 2. CRIAR TABELA DE AUDIT LOGS =====
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da operação
  table_name text NOT NULL,
  operation public.audit_operation NOT NULL,
  
  -- Dados da alteração
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  
  -- Rastreamento de usuário
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text,
  user_name text,
  
  -- Rastreamento de barbearia (multi-tenant)
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Metadata adicional
  ip_address inet,
  user_agent text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== 3. CRIAR ÍNDICES PARA PERFORMANCE =====
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_barbershop_id ON public.audit_logs(barbershop_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ===== 4. ATIVAR RLS =====
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== 5. POLÍTICAS RLS PARA AUDIT LOGS =====

-- Super admin pode ver todos os logs
CREATE POLICY "Super admin can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
);

-- Admin pode ver logs da própria barbearia
CREATE POLICY "Admin can view barbershop audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND barbershop_id = public.get_user_barbershop_id(auth.uid())
);

-- Apenas o sistema pode inserir logs (via triggers)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ===== 6. FUNÇÃO GENÉRICA DE AUDITORIA =====
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_barbershop_id uuid;
  v_operation audit_operation;
BEGIN
  -- Determinar operação
  IF (TG_OP = 'DELETE') THEN
    v_operation := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_operation := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Identificar campos alterados
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_data)
    WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;
  ELSIF (TG_OP = 'INSERT') THEN
    v_operation := 'INSERT';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  -- Obter informações do usuário
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  END IF;

  -- Obter barbershop_id do registro (se existir)
  IF TG_OP = 'DELETE' THEN
    v_barbershop_id := (v_old_data->>'barbershop_id')::uuid;
  ELSE
    v_barbershop_id := (v_new_data->>'barbershop_id')::uuid;
  END IF;

  -- Inserir log de auditoria
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    record_id,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email,
    user_name,
    barbershop_id
  ) VALUES (
    TG_TABLE_NAME,
    v_operation,
    COALESCE((v_new_data->>'id')::uuid, (v_old_data->>'id')::uuid),
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_user_id,
    v_user_email,
    v_user_name,
    v_barbershop_id
  );

  -- Retornar o registro apropriado
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ===== 7. APLICAR TRIGGERS NAS TABELAS CRÍTICAS =====

-- Barbershops
DROP TRIGGER IF EXISTS audit_barbershops_changes ON public.barbershops;
CREATE TRIGGER audit_barbershops_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Profiles
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Clients
DROP TRIGGER IF EXISTS audit_clients_changes ON public.clients;
CREATE TRIGGER audit_clients_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Services
DROP TRIGGER IF EXISTS audit_services_changes ON public.services;
CREATE TRIGGER audit_services_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Staff
DROP TRIGGER IF EXISTS audit_staff_changes ON public.staff;
CREATE TRIGGER audit_staff_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Appointments
DROP TRIGGER IF EXISTS audit_appointments_changes ON public.appointments;
CREATE TRIGGER audit_appointments_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Transactions
DROP TRIGGER IF EXISTS audit_transactions_changes ON public.transactions;
CREATE TRIGGER audit_transactions_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Campaigns
DROP TRIGGER IF EXISTS audit_campaigns_changes ON public.campaigns;
CREATE TRIGGER audit_campaigns_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- ===== 8. FUNÇÃO AUXILIAR PARA CONSULTAR HISTÓRICO =====
CREATE OR REPLACE FUNCTION public.get_record_history(
  p_table_name text,
  p_record_id uuid
)
RETURNS TABLE (
  operation text,
  changed_at timestamptz,
  changed_by text,
  changed_fields text[],
  old_values jsonb,
  new_values jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    operation::text,
    created_at as changed_at,
    COALESCE(user_name, user_email, 'Sistema') as changed_by,
    changed_fields,
    old_data as old_values,
    new_data as new_values
  FROM public.audit_logs
  WHERE table_name = p_table_name
    AND record_id = p_record_id
  ORDER BY created_at DESC;
$$;

-- Permitir execução da função
GRANT EXECUTE ON FUNCTION public.get_record_history TO authenticated;

-- ===== 9. VIEW PARA RELATÓRIO DE AUDITORIA =====
CREATE OR REPLACE VIEW public.audit_report AS
SELECT
  al.id,
  al.table_name as tabela,
  al.operation as operacao,
  al.record_id as registro_id,
  COALESCE(al.user_name, al.user_email, 'Sistema') as usuario,
  b.name as barbearia,
  al.changed_fields as campos_alterados,
  al.created_at as data_hora
FROM public.audit_logs al
LEFT JOIN public.barbershops b ON al.barbershop_id = b.id
ORDER BY al.created_at DESC;

-- ===== 10. COMENTÁRIOS PARA DOCUMENTAÇÃO =====
COMMENT ON TABLE public.audit_logs IS 'Registra todas as alterações críticas no banco de dados';
COMMENT ON COLUMN public.audit_logs.table_name IS 'Nome da tabela que sofreu alteração';
COMMENT ON COLUMN public.audit_logs.operation IS 'Tipo de operação: INSERT, UPDATE ou DELETE';
COMMENT ON COLUMN public.audit_logs.record_id IS 'ID do registro que foi alterado';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Dados anteriores (antes da alteração)';
COMMENT ON COLUMN public.audit_logs.new_data IS 'Dados novos (depois da alteração)';
COMMENT ON COLUMN public.audit_logs.changed_fields IS 'Array com os campos que foram alterados';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN public.audit_logs.barbershop_id IS 'ID da barbearia (para multi-tenant)';

-- ===== MENSAGEM DE SUCESSO =====
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de auditoria criado com sucesso!';
  RAISE NOTICE '📋 Tabelas monitoradas: barbershops, profiles, user_roles, clients, services, staff, appointments, transactions, campaigns';
  RAISE NOTICE '🔍 Use a função get_record_history(''table_name'', record_id) para ver o histórico de um registro';
  RAISE NOTICE '📊 Use a view audit_report para relatórios de auditoria';
END $$;
