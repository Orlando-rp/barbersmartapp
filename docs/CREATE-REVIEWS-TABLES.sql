-- ============================================
-- REVIEWS/RATINGS SYSTEM
-- ============================================

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id) -- One review per appointment
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_barbershop ON reviews(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_staff ON reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews for their barbershop"
  ON reviews FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert their own reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE barbershop_id IN (
        SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can update their own reviews"
  ON reviews FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE barbershop_id IN (
        SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id 
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to calculate average rating for staff
CREATE OR REPLACE FUNCTION get_staff_average_rating(staff_uuid uuid)
RETURNS numeric AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM reviews
  WHERE staff_id = staff_uuid;
$$ LANGUAGE sql STABLE;

-- Function to calculate average rating for barbershop
CREATE OR REPLACE FUNCTION get_barbershop_average_rating(barbershop_uuid uuid)
RETURNS numeric AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM reviews
  WHERE barbershop_id = barbershop_uuid;
$$ LANGUAGE sql STABLE;

-- Comments
COMMENT ON TABLE reviews IS 'Customer reviews and ratings for services and staff';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN reviews.comment IS 'Optional text review from customer';
