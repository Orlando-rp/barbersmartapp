-- ============================================
-- Script: Create Service Categories Table
-- Description: Creates the service_categories table for managing 
--              dynamic service categories per barbershop
-- ============================================

-- Create service_categories table
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6b7280',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique category names per barbershop
  CONSTRAINT unique_category_per_barbershop UNIQUE (barbershop_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_categories_barbershop 
  ON public.service_categories(barbershop_id);

CREATE INDEX IF NOT EXISTS idx_service_categories_active 
  ON public.service_categories(barbershop_id, active);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view categories from their barbershop
CREATE POLICY "Users can view their barbershop categories"
  ON public.service_categories
  FOR SELECT
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_barbershops 
      WHERE user_id = auth.uid() AND barbershop_id = service_categories.barbershop_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow admins to insert categories
CREATE POLICY "Admins can insert categories"
  ON public.service_categories
  FOR INSERT
  WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to update categories
CREATE POLICY "Admins can update categories"
  ON public.service_categories
  FOR UPDATE
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to delete categories
CREATE POLICY "Admins can delete categories"
  ON public.service_categories
  FOR DELETE
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.service_categories TO authenticated;

-- ============================================
-- Usage Notes:
-- 1. Run this script in your Supabase SQL Editor
-- 2. Categories are automatically created per barbershop
-- 3. Default categories are created via the application
--    when a barbershop has no categories
-- ============================================
