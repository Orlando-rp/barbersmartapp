-- =============================================
-- CLIENT NOTIFICATION PREFERENCES
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Adicionar colunas de preferências de notificação na tabela clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_types JSONB DEFAULT '{"appointment_created": true, "appointment_updated": true, "appointment_confirmed": true, "appointment_cancelled": true, "appointment_completed": true, "appointment_reminder": true, "no_show_reschedule": true}'::jsonb;

-- 2. Comentários nas colunas
COMMENT ON COLUMN clients.notification_enabled IS 'Se o cliente deseja receber notificações via WhatsApp';
COMMENT ON COLUMN clients.notification_types IS 'Tipos de notificação que o cliente deseja receber';

-- 3. Criar índice para consultas de notificação
CREATE INDEX IF NOT EXISTS idx_clients_notification_enabled ON clients(notification_enabled);

-- =============================================
-- NOTA: A antecedência do lembrete é configurada nas
-- CONFIGURAÇÕES DA BARBEARIA (Settings > Notificações),
-- não no cadastro do cliente.
-- =============================================
-- ESTRUTURA DO notification_types JSONB:
-- =============================================
-- {
--   "appointment_created": true,    -- Confirmação de novo agendamento
--   "appointment_updated": true,    -- Notificação de alteração
--   "appointment_confirmed": true,  -- Confirmação pelo barbeiro
--   "appointment_cancelled": true,  -- Aviso de cancelamento
--   "appointment_completed": true,  -- Pesquisa de satisfação
--   "appointment_reminder": true,   -- Lembrete de agendamento
--   "no_show_reschedule": true      -- Sugestão de reagendamento (no-show)
-- }
-- =============================================
