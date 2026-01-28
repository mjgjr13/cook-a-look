-- Add application_status and onboarding_status to advisor_profiles
ALTER TABLE public.advisor_profiles 
ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_started';

-- Update existing records based on current status
UPDATE public.advisor_profiles
SET 
  application_status = CASE 
    WHEN status = 'approved' OR status = 'active' THEN 'approved'
    WHEN status = 'rejected' THEN 'denied'
    ELSE 'pending'
  END,
  onboarding_status = CASE
    WHEN onboarding_completed_at IS NOT NULL THEN 'complete'
    WHEN status = 'approved' AND onboarding_completed_at IS NULL THEN 'required'
    ELSE 'not_started'
  END;

-- Add is_listed column (mirrors is_published but with clear semantic name)
ALTER TABLE public.advisor_profiles 
ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT false;

-- Sync is_listed with is_published for existing records
UPDATE public.advisor_profiles
SET is_listed = is_published;

-- Update verification_status in profiles to have correct default and allowed values
-- (already exists with 'pending' default which works)

-- Update get_active_published_advisors to use the new fields
CREATE OR REPLACE FUNCTION public.get_active_published_advisors()
RETURNS TABLE(
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
SET search_path = public
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
    AND ap.is_listed = true;
$$;

-- Add comments for clarity
COMMENT ON COLUMN public.advisor_profiles.application_status IS 'pending | approved | denied';
COMMENT ON COLUMN public.advisor_profiles.onboarding_status IS 'not_started | required | complete';
COMMENT ON COLUMN public.advisor_profiles.is_listed IS 'Controls public visibility on advisor board';