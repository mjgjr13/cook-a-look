-- Time zones for emails: show every date/time in the recipient's own zone.
-- Additive only. Advisors already have advisor_profiles.timezone; clients get
-- profiles.timezone (captured from the browser at sign-up) and each booking
-- records the zone the client booked from.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_timezone text;

-- Fill profiles.timezone from the sign-up metadata ({ timezone: "America/Toronto" }).
-- A separate BEFORE INSERT trigger, so handle_new_user stays untouched.
CREATE OR REPLACE FUNCTION public.set_profile_timezone_from_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text;
BEGIN
  IF NEW.timezone IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT u.raw_user_meta_data ->> 'timezone' INTO tz
      FROM auth.users u
     WHERE u.id = NEW.user_id;
    IF tz IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz) THEN
      NEW.timezone := tz;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_timezone_from_signup() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS set_profile_timezone_from_signup_trg ON public.profiles;
CREATE TRIGGER set_profile_timezone_from_signup_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_timezone_from_signup();
