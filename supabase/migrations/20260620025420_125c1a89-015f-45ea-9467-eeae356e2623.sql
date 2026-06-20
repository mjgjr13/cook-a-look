CREATE OR REPLACE FUNCTION public.restrict_booking_participant_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context text;
  v_jwt_role text;
BEGIN
  v_context := current_setting('app.booking_update_context', true);
  v_jwt_role := current_setting('request.jwt.claim.role', true);

  IF v_context IN (
    'cancel_booking',
    'cancel_booking_with_refund',
    'advisor_respond_booking',
    'respond_location_proposal',
    'mark_refund_result',
    'complete_due_bookings',
    'admin_override_refund',
    'confirm_paid_booking'
  ) THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.advisor_id IS DISTINCT FROM OLD.advisor_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.slot_id IS DISTINCT FROM OLD.slot_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.meeting_type IS DISTINCT FROM OLD.meeting_type
     OR NEW.location_id IS DISTINCT FROM OLD.location_id
     OR NEW.suggested_location IS DISTINCT FROM OLD.suggested_location
     OR NEW.location_status IS DISTINCT FROM OLD.location_status
     OR NEW.location_snapshot IS DISTINCT FROM OLD.location_snapshot
     OR NEW.in_person_surcharge_cents IS DISTINCT FROM OLD.in_person_surcharge_cents
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
     OR NEW.refund_percentage IS DISTINCT FROM OLD.refund_percentage
     OR NEW.refund_amount_cents IS DISTINCT FROM OLD.refund_amount_cents
     OR NEW.refund_status IS DISTINCT FROM OLD.refund_status
     OR NEW.refund_id IS DISTINCT FROM OLD.refund_id
     OR NEW.refund_processed_at IS DISTINCT FROM OLD.refund_processed_at
  THEN
    RAISE EXCEPTION 'Direct updates to booking fields are not allowed. Use the appropriate RPC.';
  END IF;
  RETURN NEW;
END;
$$;

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

  DELETE FROM availability_slots WHERE id = v_slot;

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
    UPDATE bookings SET status = 'cancelled', cancelled_by = 'advisor', cancelled_at = now(), refund_status = 'none', updated_at = now() WHERE id = p_booking_id;
    DELETE FROM availability_slots WHERE id = v_slot;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advisor_respond_booking(uuid, text) TO authenticated;

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

  PERFORM set_config('app.booking_update_context', 'respond_location_proposal', true);

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

CREATE OR REPLACE FUNCTION public.mark_refund_result(p_booking_id uuid, p_status text, p_refund_id text DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing TEXT;
BEGIN
  SELECT refund_status INTO v_existing FROM bookings WHERE id = p_booking_id;
  IF v_existing = 'succeeded' THEN
    RAISE EXCEPTION 'refund_already_succeeded';
  END IF;

  PERFORM set_config('app.booking_update_context', 'mark_refund_result', true);

  UPDATE bookings
     SET refund_status = p_status,
         refund_id = COALESCE(p_refund_id, refund_id),
         refund_processed_at = CASE WHEN p_status IN ('succeeded','voided','failed','manual') THEN now() ELSE refund_processed_at END,
         updated_at = now()
   WHERE id = p_booking_id;

  IF p_status IN ('succeeded','voided') THEN
    UPDATE payments SET status = 'refunded', updated_at = now()
     WHERE booking_id = p_booking_id;
  END IF;

  INSERT INTO refund_events (booking_id, actor_user_id, event_type, stripe_reference, details)
  VALUES (p_booking_id, NULL,
          CASE p_status
            WHEN 'succeeded' THEN 'refund_succeeded'
            WHEN 'failed' THEN 'refund_failed'
            WHEN 'voided' THEN 'void'
            WHEN 'manual' THEN 'manual_refund'
            ELSE 'status_update'
          END,
          p_refund_id, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_due_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.booking_update_context', 'complete_due_bookings', true);

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

CREATE OR REPLACE FUNCTION public.admin_override_refund(
  p_booking_id UUID,
  p_new_percentage INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_new_cents INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_new_percentage < 0 OR p_new_percentage > 100 THEN
    RAISE EXCEPTION 'invalid_percentage';
  END IF;

  SELECT COALESCE((SELECT ROUND(total_amount * 100)::INTEGER FROM payments WHERE booking_id = p_booking_id ORDER BY created_at DESC LIMIT 1), 0)
    INTO v_total;

  v_new_cents := FLOOR((v_total * p_new_percentage) / 100.0)::INTEGER;

  PERFORM set_config('app.booking_update_context', 'admin_override_refund', true);

  UPDATE bookings
     SET refund_percentage = p_new_percentage,
         refund_amount_cents = v_new_cents,
         refund_status = CASE WHEN v_new_cents = 0 THEN 'none' ELSE 'pending' END,
         updated_at = now()
   WHERE id = p_booking_id;

  INSERT INTO refund_events (booking_id, actor_user_id, event_type, amount_cents, percentage, details)
  VALUES (p_booking_id, auth.uid(), 'admin_override', v_new_cents, p_new_percentage,
          jsonb_build_object('note', p_note));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_override_refund(UUID, INTEGER, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_paid_booking(p_booking_id uuid, p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  v_jwt_role := current_setting('request.jwt.claim.role', true);

  IF v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  PERFORM set_config('app.booking_update_context', 'confirm_paid_booking', true);

  UPDATE bookings
     SET status = 'confirmed',
         updated_at = now()
   WHERE id = p_booking_id
     AND client_id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_paid_booking(uuid, uuid) TO service_role;