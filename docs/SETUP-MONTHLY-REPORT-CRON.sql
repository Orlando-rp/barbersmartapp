-- Configuração do Cron Job para Relatório Mensal de Ganhos
-- Execute este SQL no Supabase SQL Editor

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar o cron job para executar no 1º dia de cada mês às 09:00
-- O relatório é enviado referente ao mês anterior
SELECT cron.schedule(
  'send-monthly-earnings-report',
  '0 9 1 * *',  -- Às 09:00 do dia 1 de cada mês
  $$
  SELECT
    net.http_post(
      url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/send-monthly-earnings-report',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_tDfYcwUClvCdECz1NttPNw_GbBcs-8p"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 3. Verificar se o cron job foi criado
SELECT * FROM cron.job WHERE jobname = 'send-monthly-earnings-report';

-- 4. Para executar manualmente (teste):
-- SELECT net.http_post(
--   url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/send-monthly-earnings-report',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_tDfYcwUClvCdECz1NttPNw_GbBcs-8p"}'::jsonb,
--   body := '{}'::jsonb
-- );

-- 5. Para remover o cron job (se necessário):
-- SELECT cron.unschedule('send-monthly-earnings-report');
