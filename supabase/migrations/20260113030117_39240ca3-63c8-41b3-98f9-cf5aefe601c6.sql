-- Fix the security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.public_advisor_profiles;

CREATE VIEW public.public_advisor_profiles
WITH (security_invoker=on)
AS
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

-- Re-grant access
GRANT SELECT ON public.public_advisor_profiles TO anon, authenticated;