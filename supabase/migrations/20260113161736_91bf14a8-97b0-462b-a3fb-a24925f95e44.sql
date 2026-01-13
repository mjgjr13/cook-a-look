-- Tighten RLS on featured_advisors to prevent public exposure of payment details

BEGIN;

-- Remove overly permissive public SELECT policy
DROP POLICY IF EXISTS "Featured advisors visible to everyone" ON public.featured_advisors;

-- Ensure idempotency if re-run
DROP POLICY IF EXISTS "Advisors can view their own featured records" ON public.featured_advisors;
DROP POLICY IF EXISTS "Admins can view all featured records" ON public.featured_advisors;

-- Advisors: can read only their own featured records
CREATE POLICY "Advisors can view their own featured records"
ON public.featured_advisors
FOR SELECT
USING (
  advisor_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
);

-- Admins: can read all featured records
CREATE POLICY "Admins can view all featured records"
ON public.featured_advisors
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

COMMIT;