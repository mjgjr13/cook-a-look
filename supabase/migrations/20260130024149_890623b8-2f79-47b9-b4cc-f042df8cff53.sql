-- Update get_public_advisor_profiles to respect is_listed and suspension status
CREATE OR REPLACE FUNCTION public.get_public_advisor_profiles()
RETURNS TABLE(
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
  portfolio_url text, 
  is_demo boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    p.portfolio_url,
    p.is_demo
  FROM profiles p
  INNER JOIN advisor_profiles ap ON ap.user_id = p.user_id
  WHERE p.is_advisor = true 
    AND p.is_demo = false
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != ''
    -- Must be admin-approved (application_status = 'approved')
    AND ap.application_status = 'approved'
    -- Must have visibility toggled ON
    AND ap.is_listed = true
    -- Must NOT be suspended
    AND (p.advisor_status IS NULL OR p.advisor_status != 'suspended');
$$;