-- =============================================
-- WHATSAPP MESSAGES TABLE SETUP
-- Execute este script no Supabase SQL Editor
-- =============================================

-- 1. Criar tabela whatsapp_messages para armazenar conversas
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_barbershop ON whatsapp_messages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(barbershop_id, phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON whatsapp_messages(sent_by_user_id);

-- 3. Habilitar RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 4. Criar função para verificar se usuário pertence à barbearia
CREATE OR REPLACE FUNCTION user_belongs_to_barbershop(barbershop_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_barbershops
    WHERE user_id = auth.uid()
    AND barbershop_id = barbershop_uuid
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND barbershop_id = barbershop_uuid
  )
  OR EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND barbershop_id = barbershop_uuid
    AND active = true
  );
$$;

-- 5. Criar políticas RLS para todos os funcionários da barbearia
DROP POLICY IF EXISTS "Users can view their barbershop messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert messages for their barbershop" ON whatsapp_messages;
DROP POLICY IF EXISTS "Service role can manage all messages" ON whatsapp_messages;

-- Política de SELECT: todos os funcionários da barbearia podem ver mensagens
CREATE POLICY "Staff can view barbershop messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (user_belongs_to_barbershop(barbershop_id));

-- Política de INSERT: todos os funcionários da barbearia podem enviar mensagens
CREATE POLICY "Staff can insert barbershop messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_belongs_to_barbershop(barbershop_id));

-- Política de UPDATE: todos os funcionários da barbearia podem atualizar status
CREATE POLICY "Staff can update barbershop messages"
  ON whatsapp_messages FOR UPDATE
  TO authenticated
  USING (user_belongs_to_barbershop(barbershop_id));

-- Service role pode fazer tudo (para webhooks)
CREATE POLICY "Service role full access"
  ON whatsapp_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- 7. Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 8. Grant permissions
GRANT ALL ON whatsapp_messages TO authenticated;
GRANT ALL ON whatsapp_messages TO service_role;

-- =============================================
-- SE A TABELA JÁ EXISTE, EXECUTE APENAS ISTO:
-- =============================================
-- ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS sent_by_name TEXT;
-- CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON whatsapp_messages(sent_by_user_id);

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- SELECT * FROM whatsapp_messages LIMIT 10;
