-- Stripe Connect payouts. Additive only.
--
-- Advisors connect a Stripe Express account (stripe-connect edge function).
-- 48 hours after a completed session, release-advisor-payouts transfers the
-- advisor's share of that payment to their account; Stripe then pays it out to
-- their bank. Disputed, refunded or cancelled bookings are never transferred.

CREATE TABLE IF NOT EXISTS public.advisor_payout_accounts (
  advisor_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  country text NOT NULL,
  details_submitted boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  transfers_active boolean NOT NULL DEFAULT false,
  requirements_due integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_payout_accounts ENABLE ROW LEVEL SECURITY;

-- Advisors see their own row, admins see all. Only edge functions (service role) write.
DROP POLICY IF EXISTS "Advisors read own payout account" ON public.advisor_payout_accounts;
CREATE POLICY "Advisors read own payout account"
ON public.advisor_payout_accounts FOR SELECT TO authenticated
USING (
  advisor_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

REVOKE INSERT, UPDATE, DELETE ON public.advisor_payout_accounts FROM anon, authenticated;
GRANT SELECT ON public.advisor_payout_accounts TO authenticated;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_confirmed_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS booking_fee numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.payments.booking_fee IS 'Client booking fee charged on top of the session price (kept by the platform; not part of the advisor share)';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transfer_status text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transfer_error text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transferred_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transfer_amount_cents integer;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transfer_currency text;
COMMENT ON COLUMN public.payments.transfer_status IS 'Stripe Connect transfer to the advisor: null (not yet), paid, failed';

-- Payments due to an advisor: paid, session completed at least 48h ago, not
-- disputed/refunded, not yet transferred, advisor's Stripe account can receive.
CREATE OR REPLACE FUNCTION public.get_due_advisor_transfers(p_limit integer DEFAULT 50)
RETURNS TABLE(
  payment_id uuid,
  booking_id uuid,
  advisor_id uuid,
  stripe_account_id text,
  stripe_payment_intent_id text,
  advisor_payout numeric,
  amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pay.id, pay.booking_id, pay.advisor_id, acct.stripe_account_id,
         pay.stripe_payment_intent_id, pay.advisor_payout, pay.amount
  FROM payments pay
  JOIN bookings b ON b.id = pay.booking_id
  JOIN availability_slots s ON s.id = b.slot_id
  JOIN advisor_payout_accounts acct ON acct.advisor_id = pay.advisor_id
  WHERE pay.status = 'completed'
    AND pay.stripe_transfer_id IS NULL
    AND pay.stripe_payment_intent_id IS NOT NULL
    AND COALESCE(pay.escrow_status, 'held') IN ('held', 'released')
    AND COALESCE(pay.advisor_payout, 0) > 0
    AND b.status = 'completed'
    AND COALESCE(b.refund_status, 'none') IN ('none')
    -- Released when the client marks the session complete, or 48h after it ends.
    AND (b.client_confirmed_at IS NOT NULL OR s.end_time <= now() - INTERVAL '48 hours')
    AND NOT EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.payment_id = pay.id
        AND d.status NOT IN ('resolved', 'resolved_advisor', 'closed')
    )
    AND acct.transfers_active
  ORDER BY s.end_time
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$function$;

REVOKE ALL ON FUNCTION public.get_due_advisor_transfers(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_advisor_transfers(integer) TO service_role;

-- Run the payout job hourly (needs pg_cron + pg_net + the cron_secret in Vault,
-- all set up on CAL by setup-cal-jobs.mjs). release-advisor-payouts has
-- verify_jwt = false and checks x-cron-secret itself.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname = 'release-advisor-payouts';
    PERFORM cron.schedule(
      'release-advisor-payouts',
      '7 * * * *',
      $job$select net.http_post(
        url := 'https://qdpqfsqjtbvlulekfhoy.supabase.co/functions/v1/release-advisor-payouts',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000);$job$
    );
  END IF;
END $$;


-- Client booking fee (percent of the session price, added at checkout and
-- kept by the platform). 0 = off. Change the value here to turn it on.
INSERT INTO public.reward_settings (setting_key, setting_value, description)
VALUES ('client_booking_fee_percent', 0, 'Client booking fee as a percent of the session price (0 = off)')
ON CONFLICT (setting_key) DO NOTHING;

-- After a session the client either marks it complete (payment released to the
-- advisor at the next hourly run) or reports a problem. With no response the
-- payment is released 48 hours after the session ends.
CREATE OR REPLACE FUNCTION public.client_confirm_session(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM bookings b
    JOIN profiles c ON c.id = b.client_id
    JOIN availability_slots s ON s.id = b.slot_id
    WHERE b.id = p_booking_id
      AND c.user_id = auth.uid()
      AND b.status IN ('confirmed', 'completed')
      AND now() >= s.end_time - INTERVAL '15 minutes'
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'not_confirmable'; END IF;

  IF EXISTS (SELECT 1 FROM disputes d WHERE d.booking_id = p_booking_id AND d.status IN ('open', 'under_review')) THEN
    RAISE EXCEPTION 'dispute_open';
  END IF;

  UPDATE bookings SET client_confirmed_at = COALESCE(client_confirmed_at, now()), updated_at = now()
  WHERE id = p_booking_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.client_confirm_session(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.client_confirm_session(uuid) TO authenticated;

-- Dispute window now matches the payout hold: from the session start until 48
-- hours after it ENDS (was 48h after the start), and closed once the client
-- has marked the session complete.
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
      AND b.client_confirmed_at IS NULL
      AND now() BETWEEN s.start_time AND s.end_time + interval '48 hours'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.booking_id = p_booking_id
      AND d.status IN ('open', 'under_review')
  );
$$;

REVOKE ALL ON FUNCTION public.can_open_dispute(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_open_dispute(uuid, uuid) TO authenticated;

-- Public list of advisors who can take paid bookings (payout setup finished).
-- Returns ids only.
CREATE OR REPLACE FUNCTION public.get_advisors_accepting_bookings()
RETURNS TABLE(advisor_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.advisor_id FROM advisor_payout_accounts a
  WHERE a.transfers_active AND a.payouts_enabled;
$function$;

REVOKE ALL ON FUNCTION public.get_advisors_accepting_bookings() FROM public;
GRANT EXECUTE ON FUNCTION public.get_advisors_accepting_bookings() TO anon, authenticated;
