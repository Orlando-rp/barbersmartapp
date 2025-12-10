-- Create portfolio_photos table for barbershop gallery
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  title VARCHAR(100),
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(50),
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_portfolio_photos_barbershop ON portfolio_photos(barbershop_id);
CREATE INDEX idx_portfolio_photos_category ON portfolio_photos(category);
CREATE INDEX idx_portfolio_photos_featured ON portfolio_photos(is_featured) WHERE is_featured = true;
CREATE INDEX idx_portfolio_photos_active ON portfolio_photos(active) WHERE active = true;

-- Enable RLS
ALTER TABLE portfolio_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view active portfolio photos"
ON portfolio_photos FOR SELECT
USING (active = true);

CREATE POLICY "Barbershop staff can manage their portfolio"
ON portfolio_photos FOR ALL
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM user_barbershops WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  barbershop_id IN (
    SELECT barbershop_id FROM user_barbershops WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for portfolio bucket
CREATE POLICY "Public can view portfolio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' 
  AND auth.role() = 'authenticated'
);

-- Trigger for updated_at
CREATE TRIGGER update_portfolio_photos_updated_at
  BEFORE UPDATE ON portfolio_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON portfolio_photos TO anon;
GRANT ALL ON portfolio_photos TO authenticated;
