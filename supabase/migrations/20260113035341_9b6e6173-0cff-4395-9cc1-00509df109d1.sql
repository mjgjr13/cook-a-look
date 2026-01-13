-- The issue is that authenticated users can query the profiles table directly and get emails
-- We need to ensure that only the profile owner can see the email field
-- 
-- PostgreSQL doesn't have column-level RLS, so we need a different approach:
-- 1. Keep the current policy for authenticated users (they need it for booking flow)
-- 2. Application code should use public_advisor_profiles view for listings
-- 3. The email is only needed for the user's own profile, which they already have access to
--
-- Since we can't restrict columns with RLS, the mitigation is:
-- - Document that applications must use the view for public listings
-- - The view correctly excludes email
--
-- For additional security, we can create a function that returns advisor info without email

-- Create a secure function for fetching advisor public info
CREATE OR REPLACE FUNCTION get_advisor_public_profile(advisor_profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  specialty text,
  bio text,
  rating numeric,
  review_count integer,
  avatar_url text,
  price_per_session integer,
  virtual_available boolean,
  in_person_available boolean,
  style_tags text[],
  target_demographics text[],
  portfolio_images text[],
  session_duration integer,
  experience_years integer,
  languages text[],
  verified boolean,
  location text,
  personal_philosophy text,
  instagram_url text,
  portfolio_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.specialty,
    p.bio,
    p.rating,
    p.review_count,
    p.avatar_url,
    p.price_per_session,
    p.virtual_available,
    p.in_person_available,
    p.style_tags,
    p.target_demographics,
    p.portfolio_images,
    p.session_duration,
    p.experience_years,
    p.languages,
    p.verified,
    p.location,
    p.personal_philosophy,
    p.instagram_url,
    p.portfolio_url
  FROM profiles p
  WHERE p.id = advisor_profile_id
    AND p.is_advisor = true 
    AND p.advisor_approved = true;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION get_advisor_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_advisor_public_profile(uuid) TO authenticated;

-- Add location, personal_philosophy, instagram_url, portfolio_url to the view for completeness
DROP VIEW IF EXISTS public_advisor_profiles;

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
  verified,
  location,
  personal_philosophy,
  instagram_url,
  portfolio_url
FROM profiles
WHERE is_advisor = true AND advisor_approved = true;

-- Grant SELECT on the view
GRANT SELECT ON public_advisor_profiles TO anon;
GRANT SELECT ON public_advisor_profiles TO authenticated;