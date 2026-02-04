-- Add has_been_visible_before to track first-time publishing
ALTER TABLE public.advisor_profiles 
ADD COLUMN IF NOT EXISTS has_been_visible_before boolean DEFAULT false;

-- Set existing listed advisors as having been visible before
UPDATE public.advisor_profiles 
SET has_been_visible_before = true 
WHERE is_listed = true;