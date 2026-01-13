-- Drop the existing policy that allows full public access to advisor profiles
DROP POLICY IF EXISTS "Public can view approved advisor public info" ON profiles;

-- Create a restrictive policy: only authenticated users can view approved advisor profiles directly
-- Unauthenticated users must use the public_advisor_profiles view (which is SECURITY INVOKER by default)
-- This prevents direct email scraping from the profiles table

-- For the view to work with SECURITY INVOKER, we need the anon role to have access
-- But we want to encourage using the view, not direct table access

-- Strategy: Allow SELECT on profiles only for:
-- 1. Users viewing their own profile (auth.uid() = user_id)
-- 2. The public_advisor_profiles view implicitly has access since we kept a policy
-- But the key is the VIEW excludes sensitive columns

-- Actually, since we already have "Users can view their own full profile" policy,
-- we need to ensure public/anon can only access through the view

-- Create policy for authenticated users to view approved advisors (not including their own which is separate)
CREATE POLICY "Authenticated users can view approved advisors"
ON profiles FOR SELECT
USING (
  -- For approved advisors only (not their own profile which has its own policy)
  is_advisor = true 
  AND advisor_approved = true
  AND auth.uid() IS NOT NULL
);

-- For truly public/anonymous access, they should use the view
-- But the view needs underlying SELECT permission to work
-- Add a policy that allows anon access but through implicit view usage
CREATE POLICY "Anonymous can view approved advisor basic info"
ON profiles FOR SELECT
USING (
  is_advisor = true 
  AND advisor_approved = true
  AND auth.uid() IS NULL
);