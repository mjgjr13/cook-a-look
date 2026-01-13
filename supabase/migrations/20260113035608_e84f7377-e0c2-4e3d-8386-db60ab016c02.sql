-- Drop the current view since it won't work with SECURITY INVOKER
DROP VIEW IF EXISTS public_advisor_profiles;

-- Create a SECURITY DEFINER function that safely exposes advisor profiles
-- This function explicitly excludes email and other sensitive fields
-- It runs with the privileges of the function owner (bypassing RLS)
-- but is safe because it controls exactly which columns are returned

CREATE OR REPLACE FUNCTION get_public_advisor_profiles()
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
  is_advisor boolean,
  advisor_approved boolean,
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
SECURITY DEFINER
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
    p.is_advisor,
    p.advisor_approved,
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
  WHERE p.is_advisor = true 
    AND p.advisor_approved = true;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_public_advisor_profiles() TO anon;
GRANT EXECUTE ON FUNCTION get_public_advisor_profiles() TO authenticated;

-- Also update get_advisor_public_profile to use SECURITY DEFINER
-- so it can fetch individual advisor profiles
DROP FUNCTION IF EXISTS get_advisor_public_profile(uuid);

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
SECURITY DEFINER
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_advisor_public_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_advisor_public_profile(uuid) TO authenticated;

-- Create a recreate a simple view that wraps the function for convenience
-- This view uses the function, which safely exposes only non-sensitive columns
CREATE VIEW public_advisor_profiles AS
SELECT * FROM get_public_advisor_profiles();

-- Grant SELECT on the view
GRANT SELECT ON public_advisor_profiles TO anon;
GRANT SELECT ON public_advisor_profiles TO authenticated;