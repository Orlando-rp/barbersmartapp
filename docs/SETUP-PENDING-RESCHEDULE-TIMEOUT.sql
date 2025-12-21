-- ================================================
-- SETUP: Timeout para Reagendamentos Pendentes
-- ================================================
-- Este script configura um CRON job para cancelar automaticamente
-- agendamentos de reagendamento que não foram confirmados em 2 horas.
--
-- Pré-requisitos:
-- 1. Extensões pg_cron e pg_net habilitadas
-- 2. Edge function 'cancel-pending-reschedules' implantada
--
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- Habilitar extensões necessárias (se ainda não estiverem)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver
SELECT cron.unschedule('cancel-pending-reschedules')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cancel-pending-reschedules'
);

-- Criar CRON job para executar a cada 30 minutos
-- Isso verifica agendamentos pendentes e cancela os que passaram de 2 horas
SELECT cron.schedule(
  'cancel-pending-reschedules',
  '*/30 * * * *', -- A cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/cancel-pending-reschedules',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tc2JsbW1oaWd3c2V2bnFtaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3OTYxNjAsImV4cCI6MjA1OTM3MjE2MH0.TQhMtZ9Ff_kIm2jhT6T1CGJB04fb66SolkD_x34-VFI", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'cancel-pending-reschedules';

-- ================================================
-- NOTAS:
-- ================================================
-- O job executa a cada 30 minutos para:
-- 1. Buscar logs de 'reschedule_pending_confirmation' com mais de 2 horas
-- 2. Verificar se o agendamento ainda está pendente
-- 3. Cancelar automaticamente se não houve confirmação
-- 4. Notificar o cliente via WhatsApp sobre o cancelamento
-- 5. Registrar log com message_type = 'reschedule_timeout_cancelled'
--
-- Para monitorar:
-- SELECT * FROM whatsapp_logs 
-- WHERE message_type = 'reschedule_timeout_cancelled'
-- ORDER BY created_at DESC;
