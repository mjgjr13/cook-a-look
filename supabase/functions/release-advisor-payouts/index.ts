import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Scheduled (pg_cron, hourly): pays advisors through Stripe Connect.
// For each payment from get_due_advisor_transfers (session completed 48h+
// ago, no open dispute, no refund, advisor's account can receive transfers),
// transfers the advisor's share from that charge to their Stripe account.
//
// Clients pay in USD. If the platform balance settles in another currency
// (CAD for a Canadian account), the transfer is made in that currency using
// the charge's own exchange rate, so the advisor receives their exact share of
// what was collected; Stripe converts it to their payout currency.
// Gated by the shared CRON_SECRET header (verify_jwt = false).

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return new Response(JSON.stringify({ error: "stripe_not_configured" }), { status: 500 });
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Refresh accounts that were mid-onboarding so newly finished ones get paid.
  const { data: pendingAccounts } = await admin
    .from("advisor_payout_accounts")
    .select("advisor_id, stripe_account_id")
    .eq("transfers_active", false)
    .limit(50);
  for (const a of pendingAccounts ?? []) {
    try {
      const acct = await stripe.accounts.retrieve(a.stripe_account_id);
      await admin.from("advisor_payout_accounts").update({
        details_submitted: !!acct.details_submitted,
        payouts_enabled: !!acct.payouts_enabled,
        transfers_active: acct.capabilities?.transfers === "active",
        requirements_due: (acct.requirements?.currently_due ?? []).length,
        updated_at: new Date().toISOString(),
      }).eq("advisor_id", a.advisor_id);
    } catch (e) {
      console.error("account refresh failed", a.advisor_id, e instanceof Error ? e.message : e);
    }
  }

  const { data: due, error } = await admin.rpc("get_due_advisor_transfers", { p_limit: 50 });
  if (error) {
    console.error("get_due_advisor_transfers error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let paid = 0;
  let failed = 0;
  for (const p of due ?? []) {
    try {
      const intent = await stripe.paymentIntents.retrieve(p.stripe_payment_intent_id, {
        expand: ["latest_charge.balance_transaction"],
      });
      const charge = intent.latest_charge as Stripe.Charge | null;
      const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
      if (!charge || !bt || typeof bt === "string") throw new Error("charge_not_settled");
      if (charge.refunded || (charge.amount_refunded ?? 0) > 0) throw new Error("charge_refunded");
      if (charge.disputed) throw new Error("charge_disputed");

      // Advisor share in the charge currency (USD cents), then in the balance currency.
      const payoutChargeCents = Math.round(Number(p.advisor_payout) * 100);
      const sameCurrency = bt.currency === charge.currency;
      const rate = sameCurrency ? 1 : Number(bt.exchange_rate);
      if (!sameCurrency && !(rate > 0)) throw new Error("missing_exchange_rate");
      const amount = Math.min(Math.floor(payoutChargeCents * rate), bt.amount);
      if (amount <= 0) throw new Error("nothing_to_transfer");

      const transfer = await stripe.transfers.create(
        {
          amount,
          currency: bt.currency,
          destination: p.stripe_account_id,
          source_transaction: charge.id,
          transfer_group: `booking_${p.booking_id}`,
          description: "Cook A Look session payout",
          metadata: { payment_id: p.payment_id, booking_id: p.booking_id, advisor_id: p.advisor_id },
        },
        { idempotencyKey: `advisor-payout-${p.payment_id}` },
      );

      await admin.from("payments").update({
        stripe_transfer_id: transfer.id,
        transfer_status: "paid",
        transfer_error: null,
        transferred_at: new Date().toISOString(),
        transfer_amount_cents: amount,
        transfer_currency: bt.currency,
        escrow_status: "released",
        updated_at: new Date().toISOString(),
      }).eq("id", p.payment_id);
      paid++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("transfer failed", p.payment_id, msg);
      await admin.from("payments").update({
        transfer_status: "failed",
        transfer_error: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", p.payment_id);
    }
  }

  console.log(`advisor payouts: ${paid} paid, ${failed} failed`);
  return new Response(JSON.stringify({ paid, failed }), { headers: { "Content-Type": "application/json" } });
});
