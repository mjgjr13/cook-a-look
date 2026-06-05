
-- Prevent two booked slots at the same start time for the same advisor
CREATE UNIQUE INDEX IF NOT EXISTS availability_slots_unique_booked
  ON public.availability_slots (advisor_id, start_time)
  WHERE is_booked = true;

-- Atomic slot+booking creation
CREATE OR REPLACE FUNCTION public.book_slot(
  p_advisor_id uuid,
  p_client_user_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_is_virtual boolean DEFAULT true
)
RETURNS TABLE(booking_id uuid, slot_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_profile_id uuid;
  v_slot_id uuid;
  v_booking_id uuid;
BEGIN
  IF p_start_time <= now() THEN
    RAISE EXCEPTION 'slot_in_past';
  END IF;

  SELECT id INTO v_client_profile_id
  FROM profiles WHERE user_id = p_client_user_id;
  IF v_client_profile_id IS NULL THEN
    RAISE EXCEPTION 'client_profile_missing';
  END IF;

  -- Reject if overlap with any booked slot (including 15-min buffer)
  IF EXISTS (
    SELECT 1 FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id
      AND s.is_booked = true
      AND s.start_time < p_end_time + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > p_start_time
  ) THEN
    RAISE EXCEPTION 'slot_taken';
  END IF;

  -- Insert slot as booked; unique index serializes concurrent attempts
  BEGIN
    INSERT INTO availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
    VALUES (p_advisor_id, p_start_time, p_end_time, p_is_virtual, true)
    RETURNING id INTO v_slot_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'slot_taken';
  END;

  INSERT INTO bookings (advisor_id, client_id, slot_id, status)
  VALUES (p_advisor_id, v_client_profile_id, v_slot_id, 'pending')
  RETURNING id INTO v_booking_id;

  booking_id := v_booking_id;
  slot_id := v_slot_id;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_slot(uuid, uuid, timestamptz, timestamptz, boolean) TO authenticated, service_role;

-- Mark booking completion based on slot end time
CREATE OR REPLACE FUNCTION public.complete_due_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH due AS (
    SELECT b.id
    FROM bookings b
    JOIN availability_slots s ON s.id = b.slot_id
    WHERE b.status = 'confirmed'
      AND s.end_time < now()
  ), upd AS (
    UPDATE bookings SET status='completed', completed_at = now(), updated_at = now()
    WHERE id IN (SELECT id FROM due)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_due_bookings() TO service_role;
