-- ============================================
-- Landing Page Configuration Infrastructure
-- ============================================

-- Add landing_page_config column to barbershop_domains
ALTER TABLE barbershop_domains 
ADD COLUMN IF NOT EXISTS landing_page_config JSONB DEFAULT '{
  "template_id": "modern-minimalist",
  "sections": [],
  "global_styles": {
    "primary_color": "220 70% 50%",
    "secondary_color": "180 60% 40%",
    "accent_color": "45 100% 50%",
    "background_color": "0 0% 100%",
    "text_color": "0 0% 10%",
    "font_heading": "Playfair Display",
    "font_body": "Inter",
    "border_radius": "md"
  },
  "seo": {}
}'::jsonb;

-- Create landing-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-images',
  'landing-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Public can view landing images
CREATE POLICY "Public can view landing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-images');

-- Policy: Authenticated users can upload landing images
CREATE POLICY "Authenticated users can upload landing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'landing-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update their landing images
CREATE POLICY "Authenticated users can update landing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'landing-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete their landing images
CREATE POLICY "Authenticated users can delete landing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'landing-images'
  AND auth.role() = 'authenticated'
);
