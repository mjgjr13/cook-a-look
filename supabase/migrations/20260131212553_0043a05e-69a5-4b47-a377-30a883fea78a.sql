-- Drop and recreate get_public_advisor_profiles function to include advisor_approved for verified badge display
DROP FUNCTION IF EXISTS public.get_public_advisor_profiles();

CREATE FUNCTION public.get_public_advisor_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  specialty text,
  bio text,
  rating numeric,
  review_count integer,
  price_per_session numeric,
  avatar_url text,
  virtual_available boolean,
  in_person_available boolean,
  location text,
  style_tags text[],
  target_demographics text[],
  verified boolean,
  advisor_approved boolean,
  is_demo boolean,
  instagram_url text,
  portfolio_url text,
  personal_philosophy text,
  languages text[],
  experience_years integer
)
LANGUAGE sql
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
    p.price_per_session,
    p.avatar_url,
    p.virtual_available,
    p.in_person_available,
    p.location,
    p.style_tags,
    p.target_demographics,
    p.verified,
    p.advisor_approved,
    p.is_demo,
    p.instagram_url,
    p.portfolio_url,
    p.personal_philosophy,
    p.languages,
    p.experience_years
  FROM profiles p
  INNER JOIN advisor_profiles ap ON p.user_id = ap.user_id
  WHERE 
    p.is_advisor = true
    AND ap.application_status = 'approved'
    AND ap.is_listed = true
    AND COALESCE(p.advisor_status, 'approved') != 'suspended'
  ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST;
$$;