-- Seed/repair the mandatory test advisor availability for end-to-end booking tests
-- Creates dense availability for "Isabella Romano" across all days/times.
DO $$
DECLARE
  v_advisor_id uuid;
BEGIN
  SELECT id INTO v_advisor_id
  FROM public.profiles
  WHERE full_name = 'Isabella Romano'
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_advisor_id IS NULL THEN
    RAISE EXCEPTION 'Required test advisor "Isabella Romano" not found in public.profiles';
  END IF;

  -- Clear any existing future unbooked slots for this advisor to avoid duplicates
  DELETE FROM public.availability_slots
  WHERE advisor_id = v_advisor_id
    AND start_time > now()
    AND coalesce(is_booked, false) = false;

  -- Generate hourly slots for the next 90 days (24/7)
  INSERT INTO public.availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
  SELECT
    v_advisor_id,
    gs as start_time,
    (gs + interval '60 minutes') as end_time,
    true as is_virtual,
    false as is_booked
  FROM generate_series(
    date_trunc('hour', now()) + interval '1 hour',
    date_trunc('hour', now()) + interval '90 days',
    interval '1 hour'
  ) AS gs;
END $$;