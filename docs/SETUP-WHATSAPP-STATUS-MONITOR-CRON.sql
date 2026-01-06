-- =====================================================
-- SETUP: Cron Job para Monitoramento de Status WhatsApp
-- Executa a cada 12 horas (às 8h e 20h)
-- =====================================================

-- IMPORTANTE: Substitua os valores abaixo antes de executar:
-- SEU_SUPABASE_URL: URL do seu projeto Supabase (ex: https://xxxxx.supabase.co)
-- SEU_ANON_KEY: Chave anônima do seu projeto Supabase

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover job anterior se existir (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('whatsapp-status-monitor-12h');
EXCEPTION WHEN OTHERS THEN
  -- Job não existe ainda, ignorar
  NULL;
END;
$$;

-- 3. Criar cron job para verificar a cada 12 horas (8h e 20h)
SELECT cron.schedule(
  'whatsapp-status-monitor-12h',
  '0 8,20 * * *',  -- Às 08:00 e 20:00 todos os dias
  $$
  SELECT net.http_post(
    url := 'SEU_SUPABASE_URL/functions/v1/whatsapp-status-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SEU_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-status-monitor-12h';

-- =====================================================
-- NOTAS:
-- - O job roda às 8h e 20h no horário UTC
-- - Para horário de Brasília (UTC-3), ajuste para '0 11,23 * * *'
-- - Os status são salvos em system_config:
--   - evolution_server_status: status do servidor
--   - otp_whatsapp: status da instância OTP
-- - Alertas por e-mail são enviados se configurados
-- =====================================================
