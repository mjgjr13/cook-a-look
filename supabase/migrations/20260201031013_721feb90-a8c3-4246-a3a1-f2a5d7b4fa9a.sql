-- Add use_cases column to profiles table for advisor categorization
ALTER TABLE public.profiles
ADD COLUMN use_cases text[] DEFAULT '{}'::text[];

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.use_cases IS 'Advisor use cases: School, Office/work, Wedding, Date night, Black tie/formal, Everyday casual, Closet refresh, Sustainable';