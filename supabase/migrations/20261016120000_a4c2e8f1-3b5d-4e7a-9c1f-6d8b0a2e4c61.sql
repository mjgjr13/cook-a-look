-- Booking time zones + featured-advisor popularity. Additive / CREATE OR REPLACE only.
--
-- 1) get_available_booking_slots: "today" and the one-month window are now the
--    advisor's local date, not the UTC date. Before, an LA advisor's evening
--    slots disappeared once it was past midnight UTC (5 PM in LA), because
--    p_date < CURRENT_DATE. Past slots are always filtered by NOW().
-- 2) get_advisor_open_dates: the dates (in the CLIENT's time zone) that have at
--    least one open slot, so the calendar can grey out days with nothing free.
-- 3) get_advisor_popularity_ranks: rank of each listed advisor by popularity,
--    used for the homepage's four Featured advisors and the Recommended sort.
--    Returns only a rank, never booking counts.

CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_advisor_id uuid,
  p_date date,
  p_duration_minutes integer DEFAULT 60,
  p_buffer_minutes integer DEFAULT 15
)
RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_virtual boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_of_week INTEGER;
  v_window_start TIME;
  v_window_end TIME;
  v_window_is_virtual BOOLEAN;
  v_current_slot TIMESTAMP WITH TIME ZONE;
  v_slot_end TIMESTAMP WITH TIME ZONE;
  v_advisor_tz TEXT;
  v_has_date_override BOOLEAN;
  v_date_override_available BOOLEAN;
  v_override_start TIME;
  v_override_end TIME;
  v_today DATE;
BEGIN
  IF p_duration_minutes IS NULL OR p_duration_minutes < 15 OR p_duration_minutes > 480 THEN RETURN; END IF;

  SELECT COALESCE(ap.timezone, 'UTC') INTO v_advisor_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  IF v_advisor_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_advisor_tz) THEN
    v_advisor_tz := 'UTC';
  END IF;

  -- The advisor's own calendar date right now.
  v_today := (now() AT TIME ZONE v_advisor_tz)::date;
  IF p_date < v_today OR p_date > v_today + INTERVAL '1 month' THEN RETURN; END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  SELECT TRUE, ado.is_available, ado.start_time, ado.end_time
  INTO v_has_date_override, v_date_override_available, v_override_start, v_override_end
  FROM advisor_date_overrides ado
  WHERE ado.advisor_id = p_advisor_id AND ado.override_date = p_date;

  IF v_has_date_override AND NOT v_date_override_available THEN RETURN; END IF;

  IF v_has_date_override AND v_date_override_available THEN
    v_window_start := v_override_start;
    v_window_end := v_override_end;
    v_window_is_virtual := TRUE;
  ELSE
    SELECT aw.start_time, aw.end_time, aw.is_virtual
    INTO v_window_start, v_window_end, v_window_is_virtual
    FROM advisor_availability_windows aw
    WHERE aw.advisor_id = p_advisor_id AND aw.day_of_week = v_day_of_week;
    IF NOT FOUND THEN RETURN; END IF;
  END IF;

  v_current_slot := (p_date || ' ' || v_window_start)::TIMESTAMP AT TIME ZONE v_advisor_tz;

  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <=
        (p_date || ' ' || v_window_end)::TIMESTAMP AT TIME ZONE v_advisor_tz
  LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;

    IF NOT EXISTS (
      SELECT 1 FROM availability_slots s
      JOIN bookings b ON b.slot_id = s.id
      WHERE s.advisor_id = p_advisor_id
        AND b.status IN ('confirmed', 'pending')
        AND s.start_time < v_slot_end
        AND s.end_time > v_current_slot
    )
    AND NOT EXISTS (
      SELECT 1 FROM advisor_availability_breaks brk
      WHERE brk.advisor_id = p_advisor_id
        AND brk.day_of_week = v_day_of_week
        AND (
          ((p_date || ' ' || brk.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || brk.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM advisor_date_blocks db
      WHERE db.advisor_id = p_advisor_id
        AND db.block_date = p_date
        AND (
          ((p_date || ' ' || db.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || db.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    AND v_current_slot > NOW()
    THEN
      slot_start := v_current_slot;
      slot_end := v_slot_end;
      is_virtual := v_window_is_virtual;
      RETURN NEXT;
      v_current_slot := v_current_slot + INTERVAL '1 hour';
    ELSE
      SELECT s.end_time + (p_buffer_minutes || ' minutes')::INTERVAL
      INTO v_current_slot
      FROM availability_slots s
      JOIN bookings b ON b.slot_id = s.id
      WHERE s.advisor_id = p_advisor_id
        AND b.status IN ('confirmed', 'pending')
        AND s.end_time >= v_current_slot
        AND s.end_time < (p_date || ' ' || v_window_end)::TIMESTAMP AT TIME ZONE v_advisor_tz
      ORDER BY s.end_time
      LIMIT 1;
      IF NOT FOUND THEN
        v_current_slot := v_current_slot + INTERVAL '1 hour';
      END IF;
    END IF;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_available_booking_slots(uuid, date, integer, integer) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.get_advisor_open_dates(
  p_advisor_id uuid,
  p_client_tz text DEFAULT 'UTC',
  p_duration_minutes integer DEFAULT 60
)
RETURNS TABLE(open_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tz text := p_client_tz;
  v_advisor_tz text;
  v_today date;
  d date;
BEGIN
  IF v_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_tz) THEN
    v_tz := 'UTC';
  END IF;

  SELECT COALESCE(ap.timezone, 'UTC') INTO v_advisor_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  IF v_advisor_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_advisor_tz) THEN
    v_advisor_tz := 'UTC';
  END IF;
  v_today := (now() AT TIME ZONE v_advisor_tz)::date;

  RETURN QUERY
  SELECT DISTINCT (s.slot_start AT TIME ZONE v_tz)::date
  FROM generate_series(v_today, v_today + 32, INTERVAL '1 day') AS g(day),
       LATERAL public.get_available_booking_slots(p_advisor_id, g.day::date, p_duration_minutes, 15) s
  ORDER BY 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_advisor_open_dates(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_advisor_open_dates(uuid, text, integer) TO anon, authenticated;


-- Popularity = recent demand, lifetime completed sessions and reviews, weighted
-- by a smoothed rating (one 5-star review can't outrank fifty 4.8s).
--   score = (3 x paid bookings in the last 90 days
--            + 1 x completed sessions all time
--            + 2 x reviews) x (smoothed rating / 5)
--   smoothed rating = (rating x reviews + 4.0 x 5) / (reviews + 5)
-- Ties: smoothed rating, then reviews, then newest profile.
CREATE OR REPLACE FUNCTION public.get_advisor_popularity_ranks()
RETURNS TABLE(advisor_id uuid, popularity_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH stats AS (
    SELECT
      p.id,
      p.created_at,
      COALESCE(p.review_count, 0) AS reviews,
      (COALESCE(p.rating, 0) * COALESCE(p.review_count, 0) + 4.0 * 5) / (COALESCE(p.review_count, 0) + 5) AS smoothed,
      (SELECT count(*) FROM bookings b
        WHERE b.advisor_id = p.id
          AND b.status IN ('confirmed', 'completed')
          AND b.created_at >= now() - INTERVAL '90 days') AS recent,
      (SELECT count(*) FROM bookings b
        WHERE b.advisor_id = p.id AND b.status = 'completed') AS completed
    FROM profiles p
    WHERE p.is_advisor = true AND p.advisor_approved = true
  )
  SELECT id,
         (row_number() OVER (
            ORDER BY (3 * recent + completed + 2 * reviews) * (smoothed / 5) DESC,
                     smoothed DESC, reviews DESC, created_at DESC NULLS LAST
         ))::integer
  FROM stats;
$function$;

REVOKE ALL ON FUNCTION public.get_advisor_popularity_ranks() FROM public;
GRANT EXECUTE ON FUNCTION public.get_advisor_popularity_ranks() TO anon, authenticated;
