-- =====================================================
-- WAITLIST TABLE - Lista de Espera para Dias Lotados
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- Create waitlist table for fully booked days
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,
  preferred_time_end TIME,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
  notified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_waitlist_barbershop ON waitlist(barbershop_id);
CREATE INDEX idx_waitlist_date ON waitlist(preferred_date);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_client ON waitlist(client_id);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view waitlist from their barbershop"
ON waitlist FOR SELECT
TO authenticated
USING (barbershop_id IN (
  SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Admin and receptionist can insert waitlist"
ON waitlist FOR INSERT
TO authenticated
WITH CHECK (
  barbershop_id IN (
    SELECT barbershop_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'recepcionista')
  )
);

CREATE POLICY "Admin and receptionist can update waitlist"
ON waitlist FOR UPDATE
TO authenticated
USING (barbershop_id IN (
  SELECT barbershop_id FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('super_admin', 'admin', 'recepcionista')
));

CREATE POLICY "Admin can delete waitlist"
ON waitlist FOR DELETE
TO authenticated
USING (barbershop_id IN (
  SELECT barbershop_id FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('super_admin', 'admin')
));

-- Trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run after creating the table to verify:
-- SELECT * FROM waitlist LIMIT 1;
