
CREATE OR REPLACE FUNCTION public.advisor_respond_booking(p_booking_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_advisor_user uuid;
  v_status text;
  v_slot uuid;
BEGIN
  SELECT pa.user_id, b.status, b.slot_id
    INTO v_advisor_user, v_status, v_slot
  FROM bookings b
  JOIN profiles pa ON pa.id = b.advisor_id
  WHERE b.id = p_booking_id;

  IF v_advisor_user IS NULL THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_advisor_user <> auth.uid() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;

  IF p_action = 'accept' THEN
    UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = p_booking_id;
  ELSIF p_action = 'decline' THEN
    UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = p_booking_id;
    DELETE FROM availability_slots WHERE id = v_slot;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_advisor_user uuid;
  v_client_user uuid;
  v_status text;
  v_slot uuid;
  v_existing_notes text;
BEGIN
  SELECT pa.user_id, pc.user_id, b.status, b.slot_id, b.notes
    INTO v_advisor_user, v_client_user, v_status, v_slot, v_existing_notes
  FROM bookings b
  JOIN profiles pa ON pa.id = b.advisor_id
  JOIN profiles pc ON pc.id = b.client_id
  WHERE b.id = p_booking_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_status IN ('cancelled','completed') THEN RAISE EXCEPTION 'invalid_state'; END IF;
  IF auth.uid() NOT IN (v_advisor_user, v_client_user) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  UPDATE bookings
     SET status = 'cancelled',
         notes = COALESCE(NULLIF(p_reason, ''), v_existing_notes),
         updated_at = now()
   WHERE id = p_booking_id;

  DELETE FROM availability_slots WHERE id = v_slot;
END;
$$;

-- Allow participants to update non-status booking fields (e.g. location decisions)
CREATE POLICY "Participants can update their bookings"
ON public.bookings
FOR UPDATE
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
