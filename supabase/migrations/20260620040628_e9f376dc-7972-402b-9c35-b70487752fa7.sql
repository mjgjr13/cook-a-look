CREATE POLICY "Anon can read active locations of listed advisors"
ON public.advisor_meeting_locations
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = advisor_meeting_locations.advisor_id
      AND ap.application_status = 'approved'
      AND ap.is_listed = true
  )
);

GRANT SELECT ON public.advisor_meeting_locations TO anon;