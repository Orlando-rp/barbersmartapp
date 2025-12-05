-- =====================================================
-- CRON JOB - Expiração Automática da Lista de Espera
-- =====================================================
-- Este script configura um cron job para expirar automaticamente
-- entradas da lista de espera quando a data preferida passar.

-- 1. Habilitar extensões necessárias (execute no SQL Editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Configurar o cron job (substitua os valores conforme seu projeto)
-- O job executa todos os dias às 00:05 (meia-noite e 5 minutos)

-- IMPORTANTE: Substitua os valores abaixo:
-- - YOUR_PROJECT_REF: ref do seu projeto Supabase
-- - YOUR_ANON_KEY: sua chave anon do Supabase

SELECT cron.schedule(
  'expire-waitlist-daily',
  '5 0 * * *', -- Executa às 00:05 todos os dias
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-waitlist',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := concat('{"triggered_at": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);

-- =====================================================
-- COMANDOS ÚTEIS
-- =====================================================

-- Ver todos os cron jobs agendados:
-- SELECT * FROM cron.job;

-- Remover o cron job:
-- SELECT cron.unschedule('expire-waitlist-daily');

-- Executar manualmente para teste:
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-waitlist',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--   body := '{}'::jsonb
-- );
