-- Migração: Adicionar colunas de comissão na tabela transactions
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar colunas de comissão
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- 2. Criar índice para consultas por staff
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON transactions(staff_id);

-- 3. Criar índice composto para relatórios de comissão
CREATE INDEX IF NOT EXISTS idx_transactions_staff_date ON transactions(staff_id, transaction_date);

-- 4. Comentários nas colunas
COMMENT ON COLUMN transactions.staff_id IS 'Profissional associado à transação para cálculo de comissão';
COMMENT ON COLUMN transactions.commission_rate IS 'Taxa de comissão aplicada (%)';
COMMENT ON COLUMN transactions.commission_amount IS 'Valor da comissão calculada (R$)';

-- 5. Verificar resultado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('staff_id', 'commission_rate', 'commission_amount');
