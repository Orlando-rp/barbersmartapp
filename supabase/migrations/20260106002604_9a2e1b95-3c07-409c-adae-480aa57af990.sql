-- Adicionar colunas do Asaas na tabela global_payment_config
ALTER TABLE global_payment_config 
ADD COLUMN IF NOT EXISTS asaas_api_key TEXT,
ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS asaas_enabled BOOLEAN DEFAULT false;