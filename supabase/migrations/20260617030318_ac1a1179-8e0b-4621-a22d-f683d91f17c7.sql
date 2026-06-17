
-- ============================================================
-- Cancellation & Refund System
-- ============================================================

-- 1) Extend bookings with cancellation/refund fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_percentage INTEGER,
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_cancelled_by_check') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_cancelled_by_check
      CHECK (cancelled_by IS NULL OR cancelled_by IN ('client','advisor','admin','system'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_refund_status_check') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_refund_status_check
      CHECK (refund_status IS NULL OR refund_status IN ('none','pending','processing','succeeded','failed','voided','manual'));
  END IF;
END $$;

-- 2) Refund audit log
CREATE TABLE IF NOT EXISTS public.refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  percentage INTEGER,
  stripe_reference TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.refund_events TO authenticated;
GRANT ALL ON public.refund_events TO service_role;

ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view own refund events"
  ON public.refund_events FOR SELECT
  TO authenticated
  USING (
    public.is_booking_participant(booking_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3) Allow refund-column updates by admin/service_role only (extend trigger)
CREATE OR REPLACE FUNCTION public.restrict_booking_participant_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_user = 'service_role' THEN
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
$function$;

-- 4) Refund calculation (pure)
CREATE OR REPLACE FUNCTION public.calculate_refund(
  p_booking_id UUID,
  p_canceller TEXT
)
RETURNS TABLE(percentage INTEGER, amount_cents INTEGER, total_cents INTEGER, reason TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_meeting TEXT;
  v_total_cents INTEGER;
  v_hours NUMERIC;
  v_pct INTEGER := 0;
  v_reason TEXT;
BEGIN
  SELECT s.start_time, b.meeting_type,
         COALESCE(
           (SELECT ROUND(total_amount * 100)::INTEGER FROM payments WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1),
           0
         )
    INTO v_start, v_meeting, v_total_cents
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  WHERE b.id = p_booking_id;

  IF v_start IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_start - now())) / 3600.0;

  IF p_canceller = 'advisor' OR p_canceller = 'admin' THEN
    v_pct := 100;
    v_reason := 'Cancelled by ' || p_canceller || ' — full refund';
  ELSIF p_canceller = 'client' THEN
    IF v_hours <= 0 THEN
      v_pct := 0;
      v_reason := 'No refund — appointment time has passed';
    ELSIF v_meeting = 'in_person' THEN
      IF v_hours > 24 THEN v_pct := 100;
      ELSIF v_hours >= 12 THEN v_pct := 50;
      ELSE v_pct := 0;
      END IF;
      v_reason := 'In-person policy';
    ELSE
      IF v_hours > 24 THEN v_pct := 100;
      ELSIF v_hours >= 12 THEN v_pct := 50;
      ELSIF v_hours >= 1 THEN v_pct := 25;
      ELSE v_pct := 0;
      END IF;
      v_reason := 'Virtual policy';
    END IF;
  ELSE
    v_pct := 0;
    v_reason := 'Unknown canceller';
  END IF;

  percentage := v_pct;
  total_cents := v_total_cents;
  amount_cents := FLOOR((v_total_cents * v_pct) / 100.0)::INTEGER;
  reason := v_reason;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_refund(UUID, TEXT) TO authenticated;

-- 5) Cancel booking with refund
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

  UPDATE bookings
     SET status = 'cancelled',
         cancelled_by = v_canceller,
         cancelled_at = now(),
         cancellation_reason = NULLIF(p_reason, ''),
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

-- 6) Service-role result marker (called by edge function)
CREATE OR REPLACE FUNCTION public.mark_refund_result(
  p_booking_id UUID,
  p_status TEXT,
  p_refund_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
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

-- 7) Admin override
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
