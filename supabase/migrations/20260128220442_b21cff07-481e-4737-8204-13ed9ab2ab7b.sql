-- Update get_public_advisor_profiles to only return advisors with avatar_url
CREATE OR REPLACE FUNCTION public.get_public_advisor_profiles()
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
  portfolio_url text,
  is_demo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
  WHERE p.is_advisor = true 
    AND p.advisor_approved = true
    AND p.is_demo = false
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != '';
$$;

-- Update get_all_advisor_profiles_including_demo to also enforce photo requirement for non-demo
CREATE OR REPLACE FUNCTION public.get_all_advisor_profiles_including_demo()
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
  portfolio_url text,
  is_demo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
  WHERE p.is_advisor = true 
    AND p.advisor_approved = true
    AND (
      p.is_demo = true
      OR (p.avatar_url IS NOT NULL AND p.avatar_url != '')
    );
$$;

-- Update get_advisor_public_profile to also check for avatar
CREATE OR REPLACE FUNCTION public.get_advisor_public_profile(advisor_profile_id uuid)
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
SET search_path = 'public'
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
    AND p.advisor_approved = true
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != '';
$$;

-- Update get_active_published_advisors to require photo
CREATE OR REPLACE FUNCTION public.get_active_published_advisors()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  specialty text,
  bio text,
  price integer,
  rating numeric,
  review_count integer,
  portfolio_images text[],
  location text,
  virtual_available boolean,
  in_person_available boolean,
  experience_years integer,
  verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ap.id,
    ap.user_id,
    p.full_name,
    p.avatar_url,
    p.specialty,
    COALESCE(ap.bio, p.bio) as bio,
    COALESCE(ap.price, p.price_per_session) as price,
    p.rating,
    p.review_count,
    COALESCE(ap.portfolio_images, p.portfolio_images) as portfolio_images,
    p.location,
    p.virtual_available,
    p.in_person_available,
    p.experience_years,
    p.verified
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  JOIN user_roles ur ON ur.user_id = ap.user_id AND ur.role = 'advisor_active'
  WHERE ap.application_status = 'approved'
    AND ap.onboarding_status = 'complete'
    AND p.verification_status = 'approved'
    AND ap.is_listed = true
    AND p.avatar_url IS NOT NULL
    AND p.avatar_url != '';
$$;