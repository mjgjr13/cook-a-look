
DROP FUNCTION IF EXISTS public.get_advisor_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_advisor_public_profile(advisor_profile_id uuid)
RETURNS TABLE(
  id uuid, full_name text, specialty text, bio text, rating numeric, review_count integer,
  avatar_url text, price_per_session integer, virtual_available boolean, in_person_available boolean,
  style_tags text[], target_demographics text[], portfolio_images text[], session_duration integer,
  experience_years integer, languages text[], verified boolean, location text, personal_philosophy text,
  instagram_url text, portfolio_url text, in_person_surcharge integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.full_name, p.specialty, p.bio, p.rating, p.review_count,
    p.avatar_url, p.price_per_session, p.virtual_available, p.in_person_available,
    p.style_tags, p.target_demographics, p.portfolio_images, p.session_duration,
    p.experience_years, p.languages, p.verified, p.location, p.personal_philosophy,
    p.instagram_url, p.portfolio_url, p.in_person_surcharge
  FROM profiles p
  WHERE p.id = advisor_profile_id
    AND p.is_advisor = true 
    AND p.advisor_approved = true
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != '';
$$;
