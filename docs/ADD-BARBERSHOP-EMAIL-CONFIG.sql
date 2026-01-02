-- ============================================
-- Add Email Config Column to Barbershops
-- Version: 1.0.0
-- Description: Allows white-label barbershops to configure their own SMTP server
-- ============================================

-- Add email_config column to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS email_config jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN barbershops.email_config IS 
'Custom SMTP configuration for white-label barbershops. Format: {enabled: bool, host: string, port: number, secure: bool, user: string, pass: string, from_email: string, from_name: string}. When enabled, takes priority over global SMTP config.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_barbershops_email_config_enabled 
ON barbershops ((email_config->>'enabled'));
