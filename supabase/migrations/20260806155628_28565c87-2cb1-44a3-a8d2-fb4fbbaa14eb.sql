CREATE OR REPLACE FUNCTION public.book_slot(p_advisor_id uuid, p_client_user_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_is_virtual boolean DEFAULT true)
 RETURNS TABLE(booking_id uuid, slot_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_profile_id uuid;
  v_slot_id uuid;
  v_booking_id uuid;
  v_jwt_role text;
BEGIN
  v_jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  IF v_jwt_role <> 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() <> p_client_user_id THEN
      RAISE EXCEPTION 'unauthorized_client';
    END IF;
  END IF;

  IF p_start_time <= now() THEN
    RAISE EXCEPTION 'slot_in_past';
  END IF;

  SELECT id INTO v_client_profile_id
  FROM profiles WHERE user_id = p_client_user_id;
  IF v_client_profile_id IS NULL THEN
    RAISE EXCEPTION 'client_profile_missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id
      AND s.is_booked = true
      AND s.start_time < p_end_time + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > p_start_time
  ) THEN
    RAISE EXCEPTION 'slot_taken';
  END IF;

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
$function$;

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