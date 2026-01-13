-- Remove the policy that allows authenticated users to view other profiles
-- This is the key fix - we're removing direct table access for viewing other users
DROP POLICY IF EXISTS "Authenticated users can view approved advisors for booking" ON profiles;

-- Users can ONLY view their own profile directly from the profiles table
-- For viewing other advisors, they MUST use the public_advisor_profiles view
-- This protects email and other sensitive fields

-- The existing policy "Users can view their own full profile" already covers self-access
-- Let's verify it exists and is correct
DROP POLICY IF EXISTS "Users can view their own full profile" ON profiles;
CREATE POLICY "Users can view their own full profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- IMPORTANT: Application code MUST use public_advisor_profiles for listing advisors
-- The view excludes email, user_id, and other sensitive fields