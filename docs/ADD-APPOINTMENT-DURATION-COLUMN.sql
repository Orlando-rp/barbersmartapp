-- =====================================================
-- ADD DURATION COLUMN TO APPOINTMENTS TABLE
-- Execute this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Add duration column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;

-- Step 2: Update existing appointments with duration from their services
UPDATE public.appointments a
SET duration = COALESCE(
  (SELECT s.duration FROM public.services s WHERE s.id = a.service_id),
  30
)
WHERE a.duration IS NULL OR a.duration = 30;

-- Step 3: Add comment to document the column
COMMENT ON COLUMN public.appointments.duration IS 'Duration of the appointment in minutes, copied from service at booking time';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'appointments' 
  AND column_name = 'duration';
