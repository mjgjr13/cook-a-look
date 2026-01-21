-- Harden advisor_applications access controls and remove a misleading public-facing view

-- 1) Ensure row-level security is enabled (idempotent)
ALTER TABLE public.advisor_applications ENABLE ROW LEVEL SECURITY;

-- 2) Ensure all rows are always attributable to a user
-- (pre-checked: currently 0 rows have user_id IS NULL)
ALTER TABLE public.advisor_applications
  ALTER COLUMN user_id SET NOT NULL;

-- 3) Recreate policies to apply only to authenticated users and rely on user_id ownership
DO $$
BEGIN
  -- Drop existing policies (if present)
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own applications" ON public.advisor_applications';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create their own applications" ON public.advisor_applications';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all applications" ON public.advisor_applications';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update applications" ON public.advisor_applications';

  -- Owner read
  EXECUTE 'CREATE POLICY "Users can view their own applications"
    ON public.advisor_applications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid())';

  -- Owner create
  EXECUTE 'CREATE POLICY "Authenticated users can create their own applications"
    ON public.advisor_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid())';

  -- Admin read
  EXECUTE 'CREATE POLICY "Admins can view all applications"
    ON public.advisor_applications
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), ''admin''::public.app_role))';

  -- Admin update
  EXECUTE 'CREATE POLICY "Admins can update applications"
    ON public.advisor_applications
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), ''admin''::public.app_role))';
END $$;

-- 4) Remove the unused public_advisor_profiles view to prevent accidental direct querying
-- (The app uses the RPC function get_public_advisor_profiles() instead.)
DROP VIEW IF EXISTS public.public_advisor_profiles;