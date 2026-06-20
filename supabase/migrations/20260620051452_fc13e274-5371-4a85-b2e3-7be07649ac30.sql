GRANT SELECT ON public.advisor_meeting_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_meeting_locations TO authenticated;
GRANT ALL ON public.advisor_meeting_locations TO service_role;

DROP POLICY IF EXISTS "Anon can read active locations of listed advisors" ON public.advisor_meeting_locations;
DROP POLICY IF EXISTS "Authenticated can read active locations of listed advisors" ON public.advisor_meeting_locations;

CREATE POLICY "Public can read active locations for bookable advisors"
ON public.advisor_meeting_locations
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = advisor_meeting_locations.advisor_id
      AND p.is_advisor = true
      AND p.advisor_approved = true
      AND COALESCE(p.advisor_status, 'approved') != 'suspended'
      AND (
        ap.id IS NULL
        OR ap.application_status = 'approved'
        OR p.advisor_approved = true
      )
  )
);