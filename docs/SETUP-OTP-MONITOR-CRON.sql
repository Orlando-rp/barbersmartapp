-- =============================================
-- OTP STATUS MONITOR - CRON JOB SETUP
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar cron job para monitorar status da instância OTP a cada 5 minutos
SELECT cron.schedule(
  'otp-status-monitor',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/otp-status-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tc2JsbW1oaWd3c2V2bnFtaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjU0NjMsImV4cCI6MjA2MTcwMTQ2M30.Hti9WM_P02b_pbNg5AE8bxVL6hLQ_B62jIhUTMwGsQk'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =============================================
-- VERIFICAR CRON JOBS EXISTENTES
-- =============================================
-- SELECT * FROM cron.job;

-- =============================================
-- REMOVER CRON JOB (se necessário)
-- =============================================
-- SELECT cron.unschedule('otp-status-monitor');

-- =============================================
-- HISTÓRICO DE EXECUÇÕES
-- =============================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'otp-status-monitor')
-- ORDER BY start_time DESC 
-- LIMIT 10;
