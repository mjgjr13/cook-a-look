-- Add role column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'client';
  END IF;
END $$;

-- Create advisor_profiles table
CREATE TABLE IF NOT EXISTS public.advisor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'pending', 'approved', 'active', 'rejected', 'suspended')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  price INTEGER,
  bio TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  availability_set BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on advisor_profiles
ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for advisor_profiles
CREATE POLICY "Users can view their own advisor profile"
ON public.advisor_profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own advisor profile"
ON public.advisor_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own advisor profile"
ON public.advisor_profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all advisor profiles"
ON public.advisor_profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all advisor profiles"
ON public.advisor_profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Public can view published active advisors
CREATE POLICY "Public can view active published advisors"
ON public.advisor_profiles FOR SELECT
USING (status = 'active' AND is_published = true);

-- Add completed_at to bookings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'completed_at') THEN
    ALTER TABLE public.bookings ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create function to get public advisor profiles with full details
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
  WHERE ap.status = 'active' AND ap.is_published = true;
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_advisor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_advisor_profiles_updated_at ON public.advisor_profiles;
CREATE TRIGGER update_advisor_profiles_updated_at
  BEFORE UPDATE ON public.advisor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_advisor_profiles_updated_at();