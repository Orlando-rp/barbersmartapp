-- ================================================
-- MERCADO PAGO PAYMENT INTEGRATION
-- ================================================

-- 1. Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  mercadopago_access_token TEXT,
  mercadopago_public_key TEXT,
  allow_online_payment BOOLEAN DEFAULT false,
  allow_pay_at_location BOOLEAN DEFAULT true,
  require_deposit BOOLEAN DEFAULT false,
  deposit_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id)
);

-- 2. Add payment columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method_chosen TEXT,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);

-- payment_status values: 'pending', 'paid_online', 'paid_at_location', 'partial', 'refunded'
-- payment_method_chosen values: 'online', 'at_location'

-- 3. Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status 
ON appointments(payment_status);

-- 4. Enable RLS on payment_settings
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for payment_settings

-- Allow barbershop admins to manage their payment settings
CREATE POLICY "Admins can manage payment_settings" ON payment_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND (
      ur.barbershop_id = payment_settings.barbershop_id
      OR EXISTS (
        SELECT 1 FROM barbershops b
        WHERE b.id = payment_settings.barbershop_id
        AND b.parent_id = ur.barbershop_id
      )
    )
  )
);

-- Allow public read access for booking flow
CREATE POLICY "Public can read payment_settings for booking" ON payment_settings
FOR SELECT USING (true);

-- 6. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS payment_settings_updated_at ON payment_settings;
CREATE TRIGGER payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_settings_updated_at();

-- 8. Grant permissions
GRANT SELECT ON payment_settings TO anon;
GRANT ALL ON payment_settings TO authenticated;
