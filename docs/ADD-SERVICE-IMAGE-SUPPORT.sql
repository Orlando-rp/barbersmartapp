-- Add image_url column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-images bucket
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated users can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);
