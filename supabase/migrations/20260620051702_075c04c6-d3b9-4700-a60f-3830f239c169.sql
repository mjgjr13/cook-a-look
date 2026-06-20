CREATE OR REPLACE FUNCTION public.is_public_bookable_in_person_advisor(_advisor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = _advisor_id
      AND p.is_advisor = true
      AND p.advisor_approved = true
      AND p.in_person_available = true
      AND COALESCE(p.advisor_status, 'approved') != 'suspended'
      AND (
        ap.id IS NULL
        OR ap.application_status = 'approved'
        OR p.advisor_approved = true
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_public_bookable_in_person_advisor(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can read active locations for bookable advisors" ON public.advisor_meeting_locations;

CREATE POLICY "Public can read active locations for bookable advisors"
ON public.advisor_meeting_locations
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND public.is_public_bookable_in_person_advisor(advisor_id)
);