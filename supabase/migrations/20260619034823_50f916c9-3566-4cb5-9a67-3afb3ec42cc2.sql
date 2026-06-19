
CREATE OR REPLACE FUNCTION public.respond_location_proposal(
  p_booking_id uuid,
  p_action text,
  p_location_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor_user uuid;
  v_suggested jsonb;
  v_loc_snapshot jsonb;
BEGIN
  SELECT pa.user_id, b.suggested_location
    INTO v_advisor_user, v_suggested
  FROM bookings b
  JOIN profiles pa ON pa.id = b.advisor_id
  WHERE b.id = p_booking_id;

  IF v_advisor_user IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF v_advisor_user <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE bookings
    SET location_status = 'confirmed',
        location_snapshot = v_suggested,
        updated_at = now()
    WHERE id = p_booking_id;
  ELSIF p_action = 'counter' THEN
    IF p_location_id IS NULL THEN
      RAISE EXCEPTION 'location_id_required';
    END IF;
    SELECT jsonb_build_object('name', name, 'address', address, 'city', city)
      INTO v_loc_snapshot
    FROM advisor_meeting_locations
    WHERE id = p_location_id
      AND advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      AND is_active = true;

    IF v_loc_snapshot IS NULL THEN
      RAISE EXCEPTION 'invalid_location';
    END IF;

    UPDATE bookings
    SET location_status = 'confirmed',
        location_id = p_location_id,
        suggested_location = NULL,
        location_snapshot = v_loc_snapshot,
        updated_at = now()
    WHERE id = p_booking_id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_location_proposal(uuid, text, uuid) TO authenticated;
