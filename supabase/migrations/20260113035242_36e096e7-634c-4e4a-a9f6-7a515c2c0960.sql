-- Fix the view to use SECURITY INVOKER explicitly (default behavior, but let's be explicit)
-- The security_barrier option is for preventing leaky view optimization, not about definer/invoker
DROP VIEW IF EXISTS public_advisor_profiles;

-- Create the view with SECURITY INVOKER (queries run with the permissions of the calling user)
-- Combined with security_barrier to prevent function-based information disclosure
CREATE VIEW public_advisor_profiles 
WITH (security_barrier = true, security_invoker = true) AS
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