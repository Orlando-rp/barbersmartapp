-- ============================================
-- SPECIAL HOURS TABLE
-- For date-specific hour overrides
-- ============================================

-- Create special_hours table
CREATE TABLE IF NOT EXISTS special_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  special_date date NOT NULL,
  reason text NOT NULL,
  is_open boolean DEFAULT true,
  open_time text,
  close_time text,
  break_start text,
  break_end text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(barbershop_id, special_date)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_special_hours_barbershop ON special_hours(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_special_hours_date ON special_hours(special_date);

-- Enable RLS
ALTER TABLE special_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for special_hours
CREATE POLICY "Users can view special hours for their barbershop"
  ON special_hours FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert special hours"
  ON special_hours FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update special hours"
  ON special_hours FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can delete special hours"
  ON special_hours FOR DELETE
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
CREATE OR REPLACE FUNCTION update_special_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER special_hours_updated_at
  BEFORE UPDATE ON special_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_special_hours_updated_at();

-- Comments
COMMENT ON TABLE special_hours IS 'Store special hours overrides for specific dates (holidays with special hours, extended hours events, etc.)';
