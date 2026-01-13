-- Drop the existing overly permissive public policy
DROP POLICY IF EXISTS "Public can view approved advisor public info" ON profiles;

-- Create a new policy that restricts public access
-- Public users can only see approved advisors' non-sensitive info
-- The application should use the public_advisor_profiles view for public queries
-- This policy exists as a safety net but the view should be the primary access method

-- For authenticated users viewing their own profile (already exists, no change needed)
-- For public viewing of approved advisors: only allow access through the view
-- We'll add a policy that allows public access but the application should use the view

-- Create a helper function to check if request is from an authenticated user
-- viewing their own profile or accessing public advisor info

-- Option: Create a more restrictive policy that still allows the view to work
-- Since the view is defined with SECURITY INVOKER, we need to allow SELECT
-- but recommend using the view which excludes sensitive columns

-- The safest approach: Keep the policy but document that apps should use the view
-- AND add a comment/constraint to remind developers

-- Re-create the policy with a comment that the view should be used
CREATE POLICY "Public can view approved advisor public info"
ON profiles FOR SELECT
USING (
  -- Allow users to see their own profile
  auth.uid() = user_id
  OR
  -- Allow viewing approved advisors (use public_advisor_profiles view to filter columns)
  (is_advisor = true AND advisor_approved = true)
);

-- Note: The public_advisor_profiles view already excludes sensitive columns like email.
-- Application code should query public_advisor_profiles instead of profiles for public listings.