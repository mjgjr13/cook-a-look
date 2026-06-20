CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  booking_id UUID,
  canceller TEXT,
  refund_percentage INTEGER,
  refund_amount_cents INTEGER,
  total_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor_user UUID;
  v_client_user UUID;
  v_status TEXT;
  v_slot UUID;
  v_canceller TEXT;
  v_calc RECORD;
BEGIN
  SELECT pa.user_id, pc.user_id, b.status, b.slot_id
    INTO v_advisor_user, v_client_user, v_status, v_slot
  FROM bookings b
  JOIN profiles pa ON pa.id = b.advisor_id
  JOIN profiles pc ON pc.id = b.client_id
  WHERE b.id = p_booking_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_status IN ('cancelled','completed') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    v_canceller := 'admin';
  ELSIF auth.uid() = v_advisor_user THEN
    v_canceller := 'advisor';
  ELSIF auth.uid() = v_client_user THEN
    v_canceller := 'client';
  ELSE
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_calc FROM public.calculate_refund(p_booking_id, v_canceller);

  PERFORM set_config('app.booking_update_context', 'cancel_booking_with_refund', true);

  UPDATE bookings
     SET status = 'cancelled',
         cancelled_by = v_canceller,
         cancelled_at = now(),
         cancellation_reason = NULLIF(p_reason, ''),
         notes = COALESCE(NULLIF(p_reason, ''), notes),
         refund_percentage = v_calc.percentage,
         refund_amount_cents = v_calc.amount_cents,
         refund_status = CASE WHEN v_calc.amount_cents > 0 THEN 'pending' ELSE 'none' END,
         updated_at = now()
   WHERE id = p_booking_id;

  UPDATE availability_slots
     SET is_booked = false
   WHERE id = v_slot;

  INSERT INTO refund_events (booking_id, actor_user_id, event_type, amount_cents, percentage, details)
  VALUES (p_booking_id, auth.uid(), 'calculated', v_calc.amount_cents, v_calc.percentage,
          jsonb_build_object('canceller', v_canceller, 'reason', v_calc.reason, 'user_reason', p_reason));

  booking_id := p_booking_id;
  canceller := v_canceller;
  refund_percentage := v_calc.percentage;
  refund_amount_cents := v_calc.amount_cents;
  total_cents := v_calc.total_cents;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_with_refund(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM * FROM public.cancel_booking_with_refund(p_booking_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.advisor_respond_booking(p_booking_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  PERFORM set_config('app.booking_update_context', 'advisor_respond_booking', true);

  IF p_action = 'accept' THEN
    UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = p_booking_id;
  ELSIF p_action = 'decline' THEN
    UPDATE bookings
       SET status = 'cancelled',
           cancelled_by = 'advisor',
           cancelled_at = now(),
           refund_status = 'none',
           updated_at = now()
     WHERE id = p_booking_id;

    UPDATE availability_slots
       SET is_booked = false
     WHERE id = v_slot;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_respond_booking(uuid, text) TO authenticated;