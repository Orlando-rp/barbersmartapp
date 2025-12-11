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
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_barbershop ON whatsapp_messages(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(barbershop_id, phone_number, created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
CREATE POLICY "Users can view their barbershop messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their barbershop"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON whatsapp_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Trigger para updated_at
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

-- 6. Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 7. Grant permissions
GRANT ALL ON whatsapp_messages TO authenticated;
GRANT ALL ON whatsapp_messages TO service_role;

-- =============================================
-- VERIFICAÇÃO
-- =============================================
-- SELECT * FROM whatsapp_messages LIMIT 10;
