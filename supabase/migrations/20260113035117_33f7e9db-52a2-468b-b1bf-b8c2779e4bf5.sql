-- First, drop the policies that allow public access to the full profiles table
DROP POLICY IF EXISTS "Authenticated users can view approved advisors" ON profiles;
DROP POLICY IF EXISTS "Anonymous can view approved advisor basic info" ON profiles;

-- Recreate the public_advisor_profiles view as a SECURITY BARRIER view
-- This prevents attackers from using functions to leak hidden columns
DROP VIEW IF EXISTS public_advisor_profiles;

CREATE VIEW public_advisor_profiles WITH (security_barrier = true) AS
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

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public_advisor_profiles TO anon;
GRANT SELECT ON public_advisor_profiles TO authenticated;

-- Now create a restricted policy for profiles table
-- Only allow viewing approved advisors for authenticated users who need booking functionality
CREATE POLICY "Authenticated users can view approved advisors for booking"
ON profiles FOR SELECT
USING (
  -- User viewing their own profile (already covered by another policy, but included for clarity)
  auth.uid() = user_id
  OR
  -- Authenticated users can view approved advisors (needed for booking flow)
  (is_advisor = true AND advisor_approved = true AND auth.uid() IS NOT NULL)
);

-- NOTE: Anonymous users should use public_advisor_profiles view which excludes email
-- The view is the safe way to expose advisor info publicly