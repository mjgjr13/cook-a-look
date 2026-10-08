-- Client disputes: only the booking's own client, only within 48 hours of the
-- session start, one open dispute per booking. Opening a dispute holds the
-- payment (escrow_status = 'disputed') so the advisor can't withdraw it;
-- resolving it releases the payment unless it was refunded.

CREATE OR REPLACE FUNCTION public.can_open_dispute(p_booking_id uuid, p_payment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.profiles c ON c.id = b.client_id
    JOIN public.payments p ON p.id = p_payment_id AND p.booking_id = b.id
    JOIN public.availability_slots s ON s.id = b.slot_id
    WHERE b.id = p_booking_id
      AND c.user_id = auth.uid()
      AND p.status = 'completed'
      AND now() BETWEEN s.start_time AND s.start_time + interval '48 hours'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.booking_id = p_booking_id
      AND d.status IN ('open', 'under_review')
  );
$$;

REVOKE ALL ON FUNCTION public.can_open_dispute(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_open_dispute(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can create disputes" ON public.disputes;
CREATE POLICY "Clients can dispute their own recent paid bookings"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (
  raised_by = auth.uid()
  AND status = 'open'
  AND public.can_open_dispute(booking_id, payment_id)
);

CREATE OR REPLACE FUNCTION public.sync_dispute_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.payments
       SET escrow_status = 'disputed', updated_at = now()
     WHERE id = NEW.payment_id
       AND escrow_status IS DISTINCT FROM 'refunded';
  ELSIF NEW.status IN ('resolved', 'resolved_client', 'resolved_advisor', 'closed')
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.payments
       SET escrow_status = CASE WHEN status = 'refunded' THEN 'refunded' ELSE 'released' END,
           updated_at = now()
     WHERE id = NEW.payment_id
       AND escrow_status = 'disputed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_dispute_escrow_trg ON public.disputes;
CREATE TRIGGER sync_dispute_escrow_trg
AFTER INSERT OR UPDATE OF status ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.sync_dispute_escrow();

-- Platform fee: the reduced rate advertised to advisors (and in docs/notes) is
-- 10% from the 10th completed booking in a calendar month. The seeded value of
-- 5 was never used; payments now read these settings, so align it.
UPDATE public.reward_settings
   SET setting_value = 10, updated_at = now()
 WHERE setting_key = 'advisor_reduced_fee_percent' AND setting_value = 5;
