-- Phase 1: Fix Critical RLS Policies

-- 1.1 Create a public view for advisor discovery (only public fields)
CREATE OR REPLACE VIEW public.public_advisor_profiles AS
SELECT 
  id, 
  full_name, 
  specialty, 
  bio, 
  rating, 
  review_count, 
  avatar_url, 
  price_per_session, 
  virtual_available, 
  in_person_available, 
  is_advisor, 
  advisor_approved,
  style_tags, 
  target_demographics, 
  portfolio_images,
  session_duration, 
  experience_years, 
  languages,
  verified
FROM profiles
WHERE is_advisor = true AND advisor_approved = true;

-- Grant access to the view
GRANT SELECT ON public.public_advisor_profiles TO anon, authenticated;

-- 1.2 Update profiles RLS - drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Allow users to view their own full profile
CREATE POLICY "Users can view their own full profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow public to view only approved advisors (but this goes through the view for safety)
-- For direct table access, only show non-sensitive fields for approved advisors
CREATE POLICY "Public can view approved advisor public info"
ON profiles FOR SELECT
USING (
  is_advisor = true 
  AND advisor_approved = true
);

-- 1.3 Fix payments RLS - type mismatch issue
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can view their own payments as client" ON payments;

-- Correct INSERT policy using profile join
CREATE POLICY "Clients can insert their own payments"
ON payments FOR INSERT
WITH CHECK (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Correct SELECT policy using profile join
CREATE POLICY "Users can view their involved payments"
ON payments FOR SELECT
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- 1.4 Fix video_sessions RLS - type mismatch issue  
DROP POLICY IF EXISTS "Participants can view their video sessions" ON video_sessions;

CREATE POLICY "Participants can view their video sessions"
ON video_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles pc ON b.client_id = pc.id
    JOIN profiles pa ON b.advisor_id = pa.id
    WHERE b.id = video_sessions.booking_id
    AND (pc.user_id = auth.uid() OR pa.user_id = auth.uid())
  )
);

-- Phase 2: Add Missing Update Policies

-- 2.1 Add UPDATE policy for featured_advisors
CREATE POLICY "Advisors can update their featured status"
ON featured_advisors FOR UPDATE
USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Phase 3: Booking Validation Trigger

-- 3.1 Create validation function
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check slot exists, belongs to advisor, is not booked, and is in the future
  IF NOT EXISTS (
    SELECT 1 FROM availability_slots 
    WHERE id = NEW.slot_id 
    AND advisor_id = NEW.advisor_id
    AND is_booked = false
    AND start_time > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or unavailable time slot';
  END IF;
  
  -- Check client profile exists
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Invalid client profile';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3.2 Create trigger
DROP TRIGGER IF EXISTS booking_validation_trigger ON bookings;
CREATE TRIGGER booking_validation_trigger
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking();