-- Advisors must be 18 or older. Additive only.
-- 1. Store the applicant's date of birth on their application.
-- 2. Reject an application date of birth that makes the applicant under 18
--    (or implausible), so the rule can't be bypassed from the browser.

ALTER TABLE public.advisor_applications
  ADD COLUMN IF NOT EXISTS date_of_birth date;

CREATE OR REPLACE FUNCTION public.enforce_advisor_min_age()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    IF NEW.date_of_birth > (current_date - INTERVAL '18 years')::date THEN
      RAISE EXCEPTION 'Advisors must be 18 or older';
    END IF;
    IF NEW.date_of_birth < DATE '1910-01-01' THEN
      RAISE EXCEPTION 'Invalid date of birth';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_advisor_min_age_trg ON public.advisor_applications;
CREATE TRIGGER enforce_advisor_min_age_trg
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.advisor_applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_advisor_min_age();