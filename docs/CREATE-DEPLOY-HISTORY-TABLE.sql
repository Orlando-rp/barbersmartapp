-- ============================================
-- Deploy History Table
-- ============================================
-- Armazena o histórico de deploys disparados pelo painel admin

-- Criar tabela deploy_history
CREATE TABLE IF NOT EXISTS public.deploy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  status text NOT NULL DEFAULT 'triggered',
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  skip_health_check boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Adicionar constraint para status válidos
ALTER TABLE public.deploy_history 
ADD CONSTRAINT deploy_history_status_check 
CHECK (status IN ('triggered', 'success', 'error'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deploy_history_created_at 
ON public.deploy_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deploy_history_triggered_by 
ON public.deploy_history(triggered_by);

CREATE INDEX IF NOT EXISTS idx_deploy_history_status 
ON public.deploy_history(status);

-- Habilitar RLS
ALTER TABLE public.deploy_history ENABLE ROW LEVEL SECURITY;

-- Política: Apenas super_admin pode ver e gerenciar
CREATE POLICY "Super admins can manage deploy history"
ON public.deploy_history
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Comentários
COMMENT ON TABLE public.deploy_history IS 'Histórico de deploys disparados pelo painel admin';
COMMENT ON COLUMN public.deploy_history.tag IS 'Tag/versão do deploy (ex: v1.5.0, latest)';
COMMENT ON COLUMN public.deploy_history.status IS 'Status do deploy: triggered, success, error';
COMMENT ON COLUMN public.deploy_history.triggered_by IS 'ID do usuário que disparou o deploy';
COMMENT ON COLUMN public.deploy_history.skip_health_check IS 'Se o health check foi pulado';
COMMENT ON COLUMN public.deploy_history.error_message IS 'Mensagem de erro em caso de falha';
