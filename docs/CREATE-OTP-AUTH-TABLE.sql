-- =====================================================
-- Tabela para códigos OTP de autenticação via WhatsApp
-- =====================================================

-- Criar tabela para armazenar códigos OTP
CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_otp_phone ON auth_otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON auth_otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_phone_code ON auth_otp_codes(phone, code);

-- RLS policies
ALTER TABLE auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- Permitir que Edge Functions (service role) gerenciem códigos OTP
CREATE POLICY "Service role can manage OTP codes"
  ON auth_otp_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para limpar códigos expirados (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar cron job para limpar códigos expirados a cada hora
-- SELECT cron.schedule('cleanup-otp', '0 * * * *', 'SELECT cleanup_expired_otp()');

-- =====================================================
-- Comentários
-- =====================================================
-- phone: Número de telefone do usuário (formato: 5541999999999)
-- code: Código OTP de 6 dígitos
-- expires_at: Data/hora de expiração (5 minutos após criação)
-- verified: Se o código foi verificado com sucesso
-- attempts: Número de tentativas de verificação (máx 3)
-- created_at: Data/hora de criação do código
