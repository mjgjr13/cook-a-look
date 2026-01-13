-- Add is_demo flag to profiles for managing mock vs real advisors at launch
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create index for filtering demo profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo);

-- Drop the dependent view first, then the function
DROP VIEW IF EXISTS public.public_advisor_profiles;
DROP FUNCTION IF EXISTS public.get_public_advisor_profiles();

-- Recreate the function to exclude demo profiles in production
CREATE FUNCTION public.get_public_advisor_profiles()
 RETURNS TABLE(id uuid, full_name text, specialty text, bio text, rating numeric, review_count integer, avatar_url text, price_per_session integer, virtual_available boolean, in_person_available boolean, is_advisor boolean, advisor_approved boolean, style_tags text[], target_demographics text[], portfolio_images text[], session_duration integer, experience_years integer, languages text[], verified boolean, location text, personal_philosophy text, instagram_url text, portfolio_url text, is_demo boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND p.is_demo = false;
$function$;

-- Recreate the view with is_demo column
CREATE VIEW public.public_advisor_profiles AS
SELECT * FROM public.get_public_advisor_profiles();

-- Create a separate function for including demo profiles (for development/testing)
CREATE OR REPLACE FUNCTION public.get_all_advisor_profiles_including_demo()
 RETURNS TABLE(id uuid, full_name text, specialty text, bio text, rating numeric, review_count integer, avatar_url text, price_per_session integer, virtual_available boolean, in_person_available boolean, is_advisor boolean, advisor_approved boolean, style_tags text[], target_demographics text[], portfolio_images text[], session_duration integer, experience_years integer, languages text[], verified boolean, location text, personal_philosophy text, instagram_url text, portfolio_url text, is_demo boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND p.advisor_approved = true;
$function$;

-- Create lookbook_items table for CMS-managed lookbook content
CREATE TABLE IF NOT EXISTS public.lookbook_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT 'square',
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_lookbook_items_sort ON public.lookbook_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_lookbook_items_category ON public.lookbook_items(category);
CREATE INDEX IF NOT EXISTS idx_lookbook_items_published ON public.lookbook_items(is_published);

-- Enable RLS
ALTER TABLE public.lookbook_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published items
CREATE POLICY "Published lookbook items are viewable by everyone"
ON public.lookbook_items
FOR SELECT
USING (is_published = true);

-- Admin can manage all items (using has_role function)
CREATE POLICY "Admins can manage lookbook items"
ON public.lookbook_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_lookbook_items_updated_at
BEFORE UPDATE ON public.lookbook_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create lookbook storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lookbook', 'lookbook', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lookbook images
CREATE POLICY "Lookbook images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lookbook');

CREATE POLICY "Admins can upload lookbook images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lookbook images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lookbook images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin'));