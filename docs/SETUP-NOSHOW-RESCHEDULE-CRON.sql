-- =============================================
-- CONFIGURAR CRON JOB PARA SUGESTÕES DE REAGENDAMENTO (NO-SHOW)
-- Execute este script no Supabase SQL Editor
-- =============================================

-- IMPORTANTE: Substitua YOUR_ANON_KEY pela chave anon do seu projeto Supabase
-- Você pode encontrar essa chave em: Settings > API > anon public

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar o job que executa a cada hora
SELECT cron.schedule(
  'suggest-reschedule-noshow-hourly',
  '0 * * * *', -- Executa no minuto 0 de cada hora
  $$
  SELECT net.http_post(
    url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/suggest-reschedule-noshow',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =============================================
-- COMANDOS ÚTEIS
-- =============================================

-- Listar todos os jobs agendados:
-- SELECT * FROM cron.job;

-- Verificar execuções recentes:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Remover o job se necessário:
-- SELECT cron.unschedule('suggest-reschedule-noshow-hourly');

-- Executar manualmente para teste:
-- SELECT net.http_post(
--   url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/suggest-reschedule-noshow',
--   headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
--   body := '{}'::jsonb
-- );
