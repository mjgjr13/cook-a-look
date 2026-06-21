-- Backfill advisor_profiles rows for any approved advisor missing one,
-- so the visibility toggle and approved-state UI works for them.
INSERT INTO public.advisor_profiles (user_id, application_status, onboarding_status, is_listed, is_published)
SELECT p.user_id,
       'approved',
       'complete',
       false,
       false
FROM public.profiles p
WHERE p.is_advisor = true
  AND p.advisor_approved = true
  AND NOT EXISTS (
    SELECT 1 FROM public.advisor_profiles ap WHERE ap.user_id = p.user_id
  );