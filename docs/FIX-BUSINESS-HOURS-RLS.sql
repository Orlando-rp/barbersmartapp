-- ============================================
-- FIX RLS POLICIES FOR BUSINESS HOURS
-- Allows admins to manage hours for all their units
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view business hours for their barbershop" ON business_hours;
DROP POLICY IF EXISTS "Admins can insert business hours" ON business_hours;
DROP POLICY IF EXISTS "Admins can update business hours" ON business_hours;
DROP POLICY IF EXISTS "Admins can delete business hours" ON business_hours;

-- Create helper function to check if user has access to a barbershop (including units)
CREATE OR REPLACE FUNCTION user_can_manage_barbershop(target_barbershop_id uuid)
RETURNS boolean AS $$
DECLARE
  user_barbershop_id uuid;
  target_root_id uuid;
  user_root_id uuid;
  user_role text;
BEGIN
  -- Get user's barbershop_id and role
  SELECT p.barbershop_id, ur.role INTO user_barbershop_id, user_role
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  WHERE p.id = auth.uid();
  
  -- Super admin can manage any barbershop
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Must be admin to manage business hours
  IF user_role != 'admin' THEN
    RETURN false;
  END IF;
  
  -- If user's barbershop matches directly
  IF user_barbershop_id = target_barbershop_id THEN
    RETURN true;
  END IF;
  
  -- Get root barbershop for target (either itself or its parent)
  SELECT COALESCE(parent_id, id) INTO target_root_id
  FROM barbershops WHERE id = target_barbershop_id;
  
  -- Get root barbershop for user (either itself or its parent)
  SELECT COALESCE(parent_id, id) INTO user_root_id
  FROM barbershops WHERE id = user_barbershop_id;
  
  -- User can manage if they share the same root
  RETURN target_root_id = user_root_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT: Users can view hours for their barbershop hierarchy
CREATE POLICY "Users can view business hours for their barbershop"
  ON business_hours FOR SELECT
  USING (
    barbershop_id IN (
      SELECT b.id FROM barbershops b
      WHERE b.id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.parent_id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
         OR b.parent_id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
    )
  );

-- INSERT: Admins can insert hours for their barbershop hierarchy
CREATE POLICY "Admins can insert business hours"
  ON business_hours FOR INSERT
  WITH CHECK (user_can_manage_barbershop(barbershop_id));

-- UPDATE: Admins can update hours for their barbershop hierarchy
CREATE POLICY "Admins can update business hours"
  ON business_hours FOR UPDATE
  USING (user_can_manage_barbershop(barbershop_id));

-- DELETE: Admins can delete hours for their barbershop hierarchy
CREATE POLICY "Admins can delete business hours"
  ON business_hours FOR DELETE
  USING (user_can_manage_barbershop(barbershop_id));

-- ============================================
-- FIX RLS POLICIES FOR BLOCKED DATES
-- ============================================

DROP POLICY IF EXISTS "Users can view blocked dates for their barbershop" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can insert blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can update blocked dates" ON blocked_dates;
DROP POLICY IF EXISTS "Admins can delete blocked dates" ON blocked_dates;

CREATE POLICY "Users can view blocked dates for their barbershop"
  ON blocked_dates FOR SELECT
  USING (
    barbershop_id IN (
      SELECT b.id FROM barbershops b
      WHERE b.id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.parent_id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
         OR b.parent_id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Admins can insert blocked dates"
  ON blocked_dates FOR INSERT
  WITH CHECK (user_can_manage_barbershop(barbershop_id));

CREATE POLICY "Admins can update blocked dates"
  ON blocked_dates FOR UPDATE
  USING (user_can_manage_barbershop(barbershop_id));

CREATE POLICY "Admins can delete blocked dates"
  ON blocked_dates FOR DELETE
  USING (user_can_manage_barbershop(barbershop_id));

-- ============================================
-- FIX RLS POLICIES FOR SPECIAL HOURS
-- ============================================

DROP POLICY IF EXISTS "Users can view special hours for their barbershop" ON special_hours;
DROP POLICY IF EXISTS "Admins can insert special hours" ON special_hours;
DROP POLICY IF EXISTS "Admins can update special hours" ON special_hours;
DROP POLICY IF EXISTS "Admins can delete special hours" ON special_hours;

CREATE POLICY "Users can view special hours for their barbershop"
  ON special_hours FOR SELECT
  USING (
    barbershop_id IN (
      SELECT b.id FROM barbershops b
      WHERE b.id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.parent_id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid())
         OR b.id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
         OR b.parent_id = (SELECT parent_id FROM barbershops WHERE id = (SELECT barbershop_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Admins can insert special hours"
  ON special_hours FOR INSERT
  WITH CHECK (user_can_manage_barbershop(barbershop_id));

CREATE POLICY "Admins can update special hours"
  ON special_hours FOR UPDATE
  USING (user_can_manage_barbershop(barbershop_id));

CREATE POLICY "Admins can delete special hours"
  ON special_hours FOR DELETE
  USING (user_can_manage_barbershop(barbershop_id));
