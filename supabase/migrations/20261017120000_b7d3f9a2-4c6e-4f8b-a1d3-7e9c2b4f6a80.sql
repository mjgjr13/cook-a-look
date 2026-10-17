-- Server-side check that a booking falls inside the advisor's availability.
-- Until now book_slot only blocked overlaps, so a tampered checkout request
-- could book an advisor at 3 AM or on a day off. Additive: new helper +
-- book_slot re-created with one extra check (body otherwise unchanged).
--
-- A time is bookable when either:
--   * it is a 1, 2 or 3 hour session (3 hours also covers corporate virtual)
--     whose start is one of get_available_booking_slots for that length on the
--     advisor's local date (window, breaks, blocks, overrides, existing
--     bookings and the 15-minute buffer all apply), or
--   * it is exactly the corporate full day from get_corporate_full_day.
-- The error text contains "slot_taken" so create-checkout answers 409
-- ("pick another time") without needing a function redeploy.

CREATE OR REPLACE FUNCTION public.is_bookable_time(
  p_advisor_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tz text;
  v_date date;
  v_minutes integer;
BEGIN
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RETURN false;
  END IF;

  SELECT COALESCE(ap.timezone, 'UTC') INTO v_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  IF v_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_tz) THEN
    v_tz := 'UTC';
  END IF;
  v_date := (p_start_time AT TIME ZONE v_tz)::date;
  v_minutes := round(extract(epoch FROM (p_end_time - p_start_time)) / 60)::integer;

  IF v_minutes IN (60, 120, 180) AND EXISTS (
    SELECT 1 FROM public.get_available_booking_slots(p_advisor_id, v_date, v_minutes, 15) s
    WHERE s.slot_start = p_start_time
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.get_corporate_full_day(p_advisor_id, v_date) d
    WHERE d.day_start = p_start_time AND d.day_end = p_end_time
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.is_bookable_time(uuid, timestamptz, timestamptz) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_slot(p_advisor_id uuid, p_client_user_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_is_virtual boolean DEFAULT true, p_meeting_type text DEFAULT 'virtual'::text, p_location_id uuid DEFAULT NULL::uuid, p_suggested_location jsonb DEFAULT NULL::jsonb, p_surcharge_cents integer DEFAULT 0)
 RETURNS TABLE(booking_id uuid, slot_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_profile_id uuid;
  v_slot_id uuid;
  v_booking_id uuid;
  v_loc_status text := 'confirmed';
  v_snapshot jsonb := NULL;
  v_jwt_role text;
BEGIN
  v_jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  IF v_jwt_role <> 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() <> p_client_user_id THEN
      RAISE EXCEPTION 'unauthorized_client';
    END IF;
  END IF;

  IF p_start_time <= now() THEN RAISE EXCEPTION 'slot_in_past'; END IF;
  IF p_meeting_type NOT IN ('virtual','in_person') THEN RAISE EXCEPTION 'invalid_meeting_type'; END IF;

  SELECT id INTO v_client_profile_id FROM profiles WHERE user_id = p_client_user_id;
  IF v_client_profile_id IS NULL THEN RAISE EXCEPTION 'client_profile_missing'; END IF;

  IF p_meeting_type = 'in_person' THEN
    IF p_location_id IS NOT NULL THEN
      SELECT jsonb_build_object('name', name, 'address', address, 'city', city)
        INTO v_snapshot
        FROM advisor_meeting_locations
        WHERE id = p_location_id AND advisor_id = p_advisor_id AND is_active = true;
      IF v_snapshot IS NULL THEN RAISE EXCEPTION 'invalid_location'; END IF;
      v_loc_status := 'confirmed';
    ELSIF p_suggested_location IS NOT NULL THEN
      v_snapshot := p_suggested_location;
      v_loc_status := 'pending_advisor_approval';
    ELSE
      RAISE EXCEPTION 'location_required';
    END IF;
  END IF;

  -- The time must be one the advisor actually offers (not just any free time).
  IF NOT public.is_bookable_time(p_advisor_id, p_start_time, p_end_time) THEN
    RAISE EXCEPTION 'slot_taken: outside the advisor''s availability';
  END IF;

  IF EXISTS (
    SELECT 1 FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id AND s.is_booked = true
      AND s.start_time < p_end_time + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > p_start_time
  ) THEN RAISE EXCEPTION 'slot_taken'; END IF;

  BEGIN
    INSERT INTO availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
    VALUES (p_advisor_id, p_start_time, p_end_time, p_is_virtual, true)
    RETURNING id INTO v_slot_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'slot_taken';
  END;

  INSERT INTO bookings (
    advisor_id, client_id, slot_id, status,
    meeting_type, location_id, suggested_location,
    location_status, in_person_surcharge_cents, location_snapshot
  )
  VALUES (
    p_advisor_id, v_client_profile_id, v_slot_id, 'pending',
    p_meeting_type, p_location_id,
    CASE WHEN p_meeting_type='in_person' AND p_location_id IS NULL THEN p_suggested_location ELSE NULL END,
    v_loc_status, COALESCE(p_surcharge_cents, 0), v_snapshot
  )
  RETURNING id INTO v_booking_id;

  booking_id := v_booking_id;
  slot_id := v_slot_id;
  RETURN NEXT;
END;
$function$;

-- book_slot is only called by the create-checkout edge function (service role).
-- Stop browsers calling it directly, which skipped checkout and could hold
-- times with unpaid "pending" bookings. Covers the older 5-argument overload too.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'book_slot'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.book_slot(%s) FROM PUBLIC, anon, authenticated;', fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.book_slot(%s) TO service_role;', fn.args);
  END LOOP;
END $$;
