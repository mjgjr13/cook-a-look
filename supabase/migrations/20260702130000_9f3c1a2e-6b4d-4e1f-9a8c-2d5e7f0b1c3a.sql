-- Prevent duplicate payment rows for the same Stripe checkout session.
-- Needed now that both the client-triggered verify-payment path and the
-- new stripe-webhook path can attempt to record the same session; without
-- this, a race between the two would double-insert (double revenue/escrow).
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_checkout_session_id
  ON public.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
