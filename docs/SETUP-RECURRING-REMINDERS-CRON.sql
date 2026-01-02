-- =====================================================
-- Configuração do Cron Job para Lembretes de Agendamentos Recorrentes
-- Envia lembretes semanais todo domingo às 18h (horário de Brasília)
-- =====================================================

-- 1. Habilitar extensões necessárias (se ainda não habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Criar o cron job para enviar lembretes semanais
-- O job roda todo domingo às 21:00 UTC (18:00 horário de Brasília)
SELECT cron.schedule(
  'send-recurring-reminders-weekly',
  '0 21 * * 0', -- Domingo às 21:00 UTC (18:00 BRT)
  $$
  SELECT
    net.http_post(
      url := 'https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/send-recurring-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tc2JsbW1oaWd3c2V2bnFtaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzEwNjUsImV4cCI6MjA0ODU0NzA2NX0.z-3x_rrkU6dYoJJbz7FgPnEhq6CQbRpNgL-WLH1x0HI"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 3. Verificar jobs agendados
SELECT * FROM cron.job WHERE jobname = 'send-recurring-reminders-weekly';

-- 4. Para visualizar histórico de execução
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- 5. Para remover o job (se necessário)
-- SELECT cron.unschedule('send-recurring-reminders-weekly');

-- =====================================================
-- NOTAS:
-- - O job roda todo domingo às 18h (BRT) para notificar sobre a semana seguinte
-- - Apenas clientes com agendamentos recorrentes na próxima semana recebem
-- - Respeita as preferências de notificação do cliente e da barbearia
-- - Os logs são salvos na tabela whatsapp_logs com message_type = 'recurring_reminder'
-- =====================================================
