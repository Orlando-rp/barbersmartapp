-- ================================================
-- GLOBAL PAYMENT CONFIGURATION (STRIPE + MERCADOPAGO)
-- ================================================
-- This table stores platform-wide payment gateway credentials
-- that can be used by all tenants (white-label mode)

-- 1. Create global_payment_config table
CREATE TABLE IF NOT EXISTS global_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe Configuration
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  stripe_webhook_secret TEXT,
  stripe_enabled BOOLEAN DEFAULT false,
  
  -- Mercado Pago Configuration (Global/Platform account)
  mercadopago_access_token TEXT,
  mercadopago_public_key TEXT,
  mercadopago_webhook_secret TEXT,
  mercadopago_enabled BOOLEAN DEFAULT false,
  
  -- General Settings
  default_gateway TEXT DEFAULT 'mercadopago', -- 'stripe' or 'mercadopago'
  allow_tenant_credentials BOOLEAN DEFAULT true, -- Allow tenants to use their own credentials
  platform_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Platform fee to charge on transactions
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE global_payment_config ENABLE ROW LEVEL SECURITY;

-- 3. Only super_admin can manage global payment config
CREATE POLICY "Super admin can manage global_payment_config" ON global_payment_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- 4. Edge functions can read config (for webhook processing)
CREATE POLICY "Service role can read global_payment_config" ON global_payment_config
FOR SELECT USING (true);

-- 5. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_global_payment_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS global_payment_config_updated_at ON global_payment_config;
CREATE TRIGGER global_payment_config_updated_at
  BEFORE UPDATE ON global_payment_config
  FOR EACH ROW
  EXECUTE FUNCTION update_global_payment_config_updated_at();

-- 7. Insert default record if not exists
INSERT INTO global_payment_config (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM global_payment_config);

-- 8. Grant permissions
GRANT SELECT ON global_payment_config TO anon;
GRANT ALL ON global_payment_config TO authenticated;

-- 9. Add payment_gateway column to appointments if not exists
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'mercadopago';
-- payment_gateway values: 'stripe', 'mercadopago'
