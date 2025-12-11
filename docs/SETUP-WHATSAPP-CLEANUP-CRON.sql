-- =============================================
-- WHATSAPP MESSAGES CLEANUP CRON JOB
-- Execute este script no Supabase SQL Editor
-- Limpa mensagens com mais de 7 dias automaticamente
-- =============================================

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Configurar o cron job para executar diariamente às 3:00 AM
SELECT cron.schedule(
  'cleanup-whatsapp-messages-daily',
  '0 3 * * *', -- Todo dia às 3:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/cleanup-whatsapp-messages',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tc2JsbW1oaWd3c2V2bnFtaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTQ1MDYsImV4cCI6MjA2NDMzMDUwNn0.wwqgswurqLsGsCV5j3tQb2bxvJHOaNzPpLT8PIvkqE4"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- =============================================
-- VERIFICAR JOBS AGENDADOS
-- =============================================
-- SELECT * FROM cron.job;

-- =============================================
-- REMOVER JOB (se necessário)
-- =============================================
-- SELECT cron.unschedule('cleanup-whatsapp-messages-daily');

-- =============================================
-- EXECUTAR MANUALMENTE (para teste)
-- =============================================
-- SELECT
--   net.http_post(
--     url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/cleanup-whatsapp-messages',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   ) AS request_id;
