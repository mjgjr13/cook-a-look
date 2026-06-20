-- Grant Data API access (PostgREST) so the booking page can read locations
GRANT SELECT ON public.advisor_meeting_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_meeting_locations TO authenticated;
GRANT ALL ON public.advisor_meeting_locations TO service_role;

-- Replace read policies to also support legacy approved advisors
-- (those without an advisor_profiles row, gated by profiles.is_advisor + advisor_approved)
DROP POLICY IF EXISTS "Anon can read active locations of listed advisors" ON public.advisor_meeting_locations;
DROP POLICY IF EXISTS "Authenticated can read active locations of listed advisors" ON public.advisor_meeting_locations;

CREATE POLICY "Anon can read active locations of listed advisors"
ON public.advisor_meeting_locations
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = advisor_meeting_locations.advisor_id
      AND (
        (ap.application_status = 'approved' AND ap.is_listed = true)
        OR (ap.id IS NULL AND p.is_advisor = true AND p.advisor_approved = true)
      )
  )
);

CREATE POLICY "Authenticated can read active locations of listed advisors"
ON public.advisor_meeting_locations
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = advisor_meeting_locations.advisor_id
      AND (
        (ap.application_status = 'approved' AND ap.is_listed = true)
        OR (ap.id IS NULL AND p.is_advisor = true AND p.advisor_approved = true)
      )
  )
);