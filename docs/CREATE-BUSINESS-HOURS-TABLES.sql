-- ============================================
-- BUSINESS HOURS & BLOCKED DATES TABLES
-- ============================================

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  is_open boolean DEFAULT true,
  open_time text NOT NULL,
  close_time text NOT NULL,
  break_start text,
  break_end text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(barbershop_id, day_of_week)
);

-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  blocked_date date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(barbershop_id, blocked_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_hours_barbershop ON business_hours(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_barbershop ON blocked_dates(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(blocked_date);

-- Enable RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_hours
CREATE POLICY "Users can view business hours for their barbershop"
  ON business_hours FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert business hours"
  ON business_hours FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update business hours"
  ON business_hours FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete business hours"
  ON business_hours FOR DELETE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for blocked_dates
CREATE POLICY "Users can view blocked dates for their barbershop"
  ON blocked_dates FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert blocked dates"
  ON blocked_dates FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update blocked dates"
  ON blocked_dates FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_hours_updated_at
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_business_hours_updated_at();

-- Comments
COMMENT ON TABLE business_hours IS 'Store weekly business hours for each barbershop';
COMMENT ON TABLE blocked_dates IS 'Store blocked dates (holidays, maintenance) for each barbershop';
