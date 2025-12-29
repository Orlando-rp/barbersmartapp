-- =====================================================
-- BarberSmart - Tabelas de Monitoramento de Uptime
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Tabela de logs de verificação de uptime
CREATE TABLE IF NOT EXISTS uptime_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_uptime_logs_endpoint ON uptime_logs(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_status ON uptime_logs(status);
CREATE INDEX IF NOT EXISTS idx_uptime_logs_checked_at ON uptime_logs(checked_at DESC);

-- Habilitar RLS
ALTER TABLE uptime_logs ENABLE ROW LEVEL SECURITY;

-- Policy: apenas super admins podem ver logs de uptime
CREATE POLICY "Super admins can view uptime logs"
  ON uptime_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 2. Tabela de alertas enviados (para controle de cooldown)
CREATE TABLE IF NOT EXISTS uptime_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('email', 'whatsapp')),
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_uptime_alerts_endpoint ON uptime_alerts(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_uptime_alerts_sent_at ON uptime_alerts(sent_at DESC);

-- Habilitar RLS
ALTER TABLE uptime_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: apenas super admins podem ver alertas
CREATE POLICY "Super admins can view uptime alerts"
  ON uptime_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 3. Tabela de configuração de monitoramento (opcional)
CREATE TABLE IF NOT EXISTS uptime_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO uptime_config (config_key, config_value, description)
VALUES 
  ('alert_threshold', '2', 'Número de falhas consecutivas antes de alertar'),
  ('cooldown_minutes', '15', 'Minutos entre alertas para o mesmo endpoint'),
  ('check_interval_minutes', '5', 'Intervalo entre verificações em minutos')
ON CONFLICT (config_key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE uptime_config ENABLE ROW LEVEL SECURITY;

-- Policy: super admins podem gerenciar configurações
CREATE POLICY "Super admins can manage uptime config"
  ON uptime_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 4. View para dashboard de uptime (últimas 24h)
CREATE OR REPLACE VIEW uptime_dashboard AS
SELECT 
  endpoint_name,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
  COUNT(*) FILTER (WHERE status = 'degraded') as degraded_count,
  COUNT(*) FILTER (WHERE status = 'down') as down_count,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'healthy')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) as uptime_percentage,
  ROUND(AVG(response_time_ms), 0) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  MIN(response_time_ms) as min_response_time,
  MAX(checked_at) as last_check
FROM uptime_logs
WHERE checked_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint_name
ORDER BY endpoint_name;

-- 5. Função para limpar logs antigos (manter apenas 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_uptime_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM uptime_logs
  WHERE checked_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM uptime_alerts
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  RETURN deleted_count;
END;
$$;

-- 6. Comentários para documentação
COMMENT ON TABLE uptime_logs IS 'Histórico de verificações de uptime dos endpoints do sistema';
COMMENT ON TABLE uptime_alerts IS 'Registro de alertas enviados para controle de cooldown';
COMMENT ON TABLE uptime_config IS 'Configurações do sistema de monitoramento';
COMMENT ON VIEW uptime_dashboard IS 'Dashboard resumido de uptime das últimas 24 horas';
