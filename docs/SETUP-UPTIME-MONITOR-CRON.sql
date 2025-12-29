-- =====================================================
-- BarberSmart - Cron Job para Monitoramento de Uptime
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- IMPORTANTE: Substitua os valores abaixo:
-- - YOUR_PROJECT_REF: ID do seu projeto Supabase (ex: nmsblmmhigwsevnqmhwn)
-- - YOUR_ANON_KEY: Chave anônima do Supabase

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Cron job para verificação a cada 5 minutos
SELECT cron.schedule(
  'uptime-monitor-check',
  '*/5 * * * *',  -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/uptime-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 3. Cron job para limpeza de logs antigos (uma vez por dia às 4:00 AM)
SELECT cron.schedule(
  'uptime-cleanup-logs',
  '0 4 * * *',  -- Todo dia às 4:00 AM UTC
  $$
  SELECT cleanup_old_uptime_logs();
  $$
);

-- =====================================================
-- Comandos Úteis
-- =====================================================

-- Verificar cron jobs ativos:
-- SELECT * FROM cron.job WHERE jobname LIKE 'uptime%';

-- Desabilitar monitoramento temporariamente:
-- SELECT cron.unschedule('uptime-monitor-check');

-- Reabilitar monitoramento:
-- (Execute novamente o SELECT cron.schedule acima)

-- Ver histórico de execuções:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'uptime%')
-- ORDER BY start_time DESC
-- LIMIT 20;

-- Testar manualmente a função de limpeza:
-- SELECT cleanup_old_uptime_logs();

-- =====================================================
-- Exemplo com valores reais (NÃO EXECUTE SEM AJUSTAR!)
-- =====================================================
/*
SELECT cron.schedule(
  'uptime-monitor-check',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/uptime-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
*/
