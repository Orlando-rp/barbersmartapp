-- ============================================
-- WHATSAPP LOGS TABLE SETUP
-- ============================================
-- Execute este script no Supabase SQL Editor
-- para criar a tabela de logs do WhatsApp
-- ============================================

-- Create whatsapp_logs table to track all WhatsApp messages sent
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  whatsapp_message_id TEXT,
  error_message TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_barbershop_id ON whatsapp_logs(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_appointment_id ON whatsapp_logs(appointment_id);

-- Enable RLS
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view logs from their barbershop" ON whatsapp_logs;
DROP POLICY IF EXISTS "Users can insert logs for their barbershop" ON whatsapp_logs;

-- RLS Policies for whatsapp_logs
CREATE POLICY "Users can view logs from their barbershop"
  ON whatsapp_logs FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert logs for their barbershop"
  ON whatsapp_logs FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_whatsapp_logs_updated_at ON whatsapp_logs;
CREATE TRIGGER update_whatsapp_logs_updated_at
  BEFORE UPDATE ON whatsapp_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get WhatsApp statistics
CREATE OR REPLACE FUNCTION get_whatsapp_stats(barbershop_uuid UUID, days_ago INT DEFAULT 30)
RETURNS TABLE (
  total_sent BIGINT,
  total_success BIGINT,
  total_failed BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_sent,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as total_success,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as total_failed,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'sent')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as success_rate
  FROM whatsapp_logs
  WHERE barbershop_id = barbershop_uuid
    AND created_at >= NOW() - INTERVAL '1 day' * days_ago;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON whatsapp_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_stats TO authenticated;