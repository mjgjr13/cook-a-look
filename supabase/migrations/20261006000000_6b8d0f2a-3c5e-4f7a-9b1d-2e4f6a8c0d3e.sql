-- New cancellation policy (owner decision, 2026-10-06). Replaces the refund
-- percentages in calculate_refund; signature, return shape, security and
-- grants are unchanged, so cancel_booking_with_refund and the cancel dialog
-- pick it up automatically.
--   Advisor or admin cancels: 100% refund, any time.
--   Client cancels before the start time: 100% refund, except a 10% fee
--   (90% refund) within 1 hour of a video session or 2 hours of an in-person one.
--   After the start time: no refund (the session has happened or was missed).
-- UI copy (BookingCalendar, FAQ) must match this function.

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
  v_late_window NUMERIC;
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
  v_late_window := CASE WHEN v_meeting = 'in_person' THEN 2 ELSE 1 END;

  IF p_canceller = 'advisor' OR p_canceller = 'admin' THEN
    v_pct := 100;
    v_reason := 'Cancelled by ' || p_canceller || ' — full refund';
  ELSIF p_canceller = 'client' THEN
    IF v_hours <= 0 THEN
      v_pct := 0;
      v_reason := 'No refund — appointment time has passed';
    ELSIF v_hours <= v_late_window THEN
      v_pct := 90;
      v_reason := 'Late cancellation — 10% fee';
    ELSE
      v_pct := 100;
      v_reason := 'Full refund';
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
