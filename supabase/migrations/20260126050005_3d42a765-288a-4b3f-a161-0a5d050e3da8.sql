-- Fix 1: Availability slots - restrict to authenticated users only (prevent competitor/stalker access)
DROP POLICY IF EXISTS "Availability visible to everyone" ON public.availability_slots;

CREATE POLICY "Authenticated users can view future availability"
ON public.availability_slots FOR SELECT
TO authenticated
USING (
  start_time > now() 
  AND is_booked = false
);

-- Fix 2: Profiles - add explicit deny for unauthenticated access and restrict authenticated access
-- Drop existing policy first
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix 3: Advisor applications - add explicit deny for anonymous access
-- The existing policies use auth.uid() which already denies anonymous access,
-- but let's add explicit protection by ensuring RLS is properly enforced

-- Add explicit policy to deny public access (belt and suspenders approach)
CREATE POLICY "Deny anonymous access to applications"
ON public.advisor_applications FOR SELECT
TO anon
USING (false);

-- Fix 4: Add explicit anonymous deny policy for profiles 
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);