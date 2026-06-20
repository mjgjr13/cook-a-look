GRANT SELECT ON public.advisor_meeting_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_meeting_locations TO authenticated;
GRANT ALL ON public.advisor_meeting_locations TO service_role;