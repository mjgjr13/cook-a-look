-- Corporate bookings + portfolio requirement (owner request, 2026-10-06).
-- Additive except for replacing get_public_corporate_advisors (added in
-- 20261006120000) so it no longer exposes any price.
--
-- Corporate engagements are booked through the normal booking/checkout path
-- (create-checkout -> book_slot -> Stripe -> confirmPayment), so the platform
-- fee, escrow, refunds and cancellation policy apply unchanged:
--   * virtual corporate session  = 3-hour block, advisor's corporate virtual rate
--   * on-site corporate day      = advisor's whole available day, corporate on-site rate
-- Rates are only readable by signed-in users at checkout (get_corporate_booking_info).

-- 1) Advisor corporate rates (whole dollars, flat per engagement)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS corporate_virtual_rate integer,
  ADD COLUMN IF NOT EXISTS corporate_in_person_rate integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_corporate_rates_range') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_corporate_rates_range CHECK (
      (corporate_virtual_rate IS NULL OR corporate_virtual_rate BETWEEN 1 AND 1000000)
      AND (corporate_in_person_rate IS NULL OR corporate_in_person_rate BETWEEN 1 AND 1000000)
    );
  END IF;
END $$;

-- 2) Corporate booking details (group size, company/location, about). Same
--    row-level security as the rest of the booking row (participants + admin).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_corporate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS corporate_details jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_corporate_details_size') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_corporate_details_size
      CHECK (corporate_details IS NULL OR pg_column_size(corporate_details) <= 4000);
  END IF;
END $$;

-- 3) Public B2B listing info: services, industries and which formats are
--    offered. No prices (those are shown only at checkout).
DROP FUNCTION IF EXISTS public.get_public_corporate_advisors();
CREATE FUNCTION public.get_public_corporate_advisors()
RETURNS TABLE (
  id uuid,
  corporate_services text[],
  corporate_industries text,
  offers_virtual boolean,
  offers_on_site boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.corporate_services, p.corporate_industries,
         p.corporate_virtual_rate IS NOT NULL,
         p.corporate_in_person_rate IS NOT NULL
  FROM profiles p
  WHERE p.is_advisor = true
    AND p.advisor_approved = true
    AND p.offers_corporate = true
    AND (p.corporate_virtual_rate IS NOT NULL OR p.corporate_in_person_rate IS NOT NULL)
    AND COALESCE(p.advisor_status, 'approved') != 'suspended';
$$;
REVOKE ALL ON FUNCTION public.get_public_corporate_advisors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_corporate_advisors() TO anon, authenticated, service_role;

-- 4) Corporate rates for the checkout summary — signed-in users only.
CREATE OR REPLACE FUNCTION public.get_corporate_booking_info(p_advisor_id uuid)
RETURNS TABLE (virtual_rate integer, in_person_rate integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN QUERY
  SELECT p.corporate_virtual_rate, p.corporate_in_person_rate
  FROM profiles p
  WHERE p.id = p_advisor_id
    AND p.is_advisor = true
    AND p.advisor_approved = true
    AND p.offers_corporate = true;
END;
$$;
REVOKE ALL ON FUNCTION public.get_corporate_booking_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_corporate_booking_info(uuid) TO authenticated, service_role;

-- 5) Whole-day availability for an on-site corporate day. Uses the same
--    window rules as get_available_booking_slots (date override, else weekly
--    window, advisor timezone, 1-month horizon) and returns the day's window
--    only if nothing is booked or blocked inside it. Daily breaks are
--    ignored: a full-day engagement includes them.
CREATE OR REPLACE FUNCTION public.get_corporate_full_day(p_advisor_id uuid, p_date date)
RETURNS TABLE (day_start timestamptz, day_end timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_has_override boolean;
  v_override_available boolean;
  v_start time;
  v_end time;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  IF p_date < CURRENT_DATE OR p_date > CURRENT_DATE + INTERVAL '1 month' THEN RETURN; END IF;

  SELECT COALESCE(ap.timezone, 'UTC') INTO v_tz
  FROM advisor_profiles ap JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;

  SELECT TRUE, ado.is_available, ado.start_time, ado.end_time
    INTO v_has_override, v_override_available, v_start, v_end
  FROM advisor_date_overrides ado
  WHERE ado.advisor_id = p_advisor_id AND ado.override_date = p_date;

  IF v_has_override AND NOT v_override_available THEN RETURN; END IF;

  IF NOT COALESCE(v_has_override, false) THEN
    SELECT aw.start_time, aw.end_time INTO v_start, v_end
    FROM advisor_availability_windows aw
    WHERE aw.advisor_id = p_advisor_id AND aw.day_of_week = EXTRACT(DOW FROM p_date)::int;
    IF NOT FOUND THEN RETURN; END IF;
  END IF;

  IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN RETURN; END IF;

  v_day_start := (p_date || ' ' || v_start)::timestamp AT TIME ZONE v_tz;
  v_day_end := (p_date || ' ' || v_end)::timestamp AT TIME ZONE v_tz;

  IF v_day_start <= now() THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM availability_slots s
    JOIN bookings b ON b.slot_id = s.id
    WHERE s.advisor_id = p_advisor_id
      AND b.status IN ('confirmed', 'pending')
      AND s.start_time < v_day_end + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > v_day_start
  ) THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM advisor_date_blocks db
    WHERE db.advisor_id = p_advisor_id AND db.block_date = p_date
  ) THEN RETURN; END IF;

  day_start := v_day_start;
  day_end := v_day_end;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.get_corporate_full_day(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_corporate_full_day(uuid, date) TO anon, authenticated, service_role;

-- 6) An advisor can't go live (is_listed = true) without at least one
--    portfolio photo. Only checked when switching on, so advisors who are
--    already live are not taken down by this migration.
CREATE OR REPLACE FUNCTION public.require_portfolio_to_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_listed = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_listed, false) = false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = NEW.user_id
        AND COALESCE(array_length(p.portfolio_images, 1), 0) > 0
    ) THEN
      RAISE EXCEPTION 'portfolio_required' USING HINT = 'Add at least one portfolio photo before going live.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_portfolio_to_list() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS require_portfolio_to_list_trg ON public.advisor_profiles;
CREATE TRIGGER require_portfolio_to_list_trg
  BEFORE INSERT OR UPDATE OF is_listed ON public.advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.require_portfolio_to_list();
