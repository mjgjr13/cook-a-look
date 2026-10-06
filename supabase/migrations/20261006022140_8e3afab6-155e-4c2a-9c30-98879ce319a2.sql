-- Corporate / B2B image consulting (opt-in for advisors). Additive only.
--
-- New advisor-editable columns on profiles. Existing row-level security on
-- profiles already limits updates to the row owner (and admins), the same as
-- specialty / style_tags / target_demographics, so no policy changes are
-- needed. The privilege-escalation trigger is intentionally not extended:
-- like specialties, these are self-described by the advisor.
--
-- offers_corporate defaults to false, so existing advisors are unaffected.
-- corporate_starting_price is display-only ("starting from", whole dollars);
-- it is not used by booking, Stripe, or platform-fee logic.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS offers_corporate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS corporate_services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS corporate_industries text,
  ADD COLUMN IF NOT EXISTS corporate_starting_price integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_corporate_services_allowed') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_corporate_services_allowed
      CHECK (corporate_services <@ ARRAY['Group workshops', 'One-on-one executive styling', 'Dress code consulting', 'Other']::text[]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_corporate_industries_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_corporate_industries_length
      CHECK (corporate_industries IS NULL OR char_length(corporate_industries) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_corporate_starting_price_nonnegative') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_corporate_starting_price_nonnegative
      CHECK (corporate_starting_price IS NULL OR (corporate_starting_price >= 0 AND corporate_starting_price <= 1000000));
  END IF;
END $$;

-- Public read of the B2B fields only, for approved advisors who opted in.
-- The directory and profile page merge this with their existing RPC results,
-- so the existing public functions are left untouched.
CREATE OR REPLACE FUNCTION public.get_public_corporate_advisors()
RETURNS TABLE (
  id uuid,
  corporate_services text[],
  corporate_industries text,
  corporate_starting_price integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.corporate_services, p.corporate_industries, p.corporate_starting_price
  FROM profiles p
  WHERE p.is_advisor = true
    AND p.advisor_approved = true
    AND p.offers_corporate = true
    AND COALESCE(p.advisor_status, 'approved') != 'suspended';
$$;

REVOKE ALL ON FUNCTION public.get_public_corporate_advisors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_corporate_advisors() TO anon, authenticated, service_role;