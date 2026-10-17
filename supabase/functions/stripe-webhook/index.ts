import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { confirmPaidCheckoutSession } from "../_shared/confirmPayment.ts";

// Server-to-server endpoint: Stripe calls this directly, not the browser.
// No CORS handling and no Supabase JWT - authenticity is verified via the
// Stripe signature below. This is the durable backstop for the client's
// own verify-payment call on the success page: if the browser never gets
// there (closed tab, crash, lost network), this still confirms the booking.
//
// Two Stripe event destinations point here, each with its own signing secret:
//   STRIPE_WEBHOOK_SECRET          - events from the Cook A Look account
//                                    (checkout.session.completed, transfer.*)
//   STRIPE_CONNECT_WEBHOOK_SECRET  - events from advisors' connected accounts
//                                    (account.updated, payout.*)
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const secrets = [Deno.env.get("STRIPE_WEBHOOK_SECRET"), Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")]
    .filter((s): s is string => !!s);
  if (!signature || secrets.length === 0) {
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const body = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret);
      break;
    } catch {
      // try the next destination's secret
    }
  }
  if (!event) {
    console.error("Webhook signature verification failed for all secrets");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const ok = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ received: true, ...extra }), { status: 200 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await confirmPaidCheckoutSession(supabaseAdmin, session);
        console.log("Webhook confirmed session:", session.id, result);
        return ok();
      }

      // An advisor's payout account changed (finished onboarding, needs more
      // info, payouts paused...). Keep our copy in step so bookings and
      // transfers are allowed or blocked straight away.
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const { error } = await supabaseAdmin.from("advisor_payout_accounts").update({
          details_submitted: !!acct.details_submitted,
          payouts_enabled: !!acct.payouts_enabled,
          transfers_active: acct.capabilities?.transfers === "active",
          requirements_due: (acct.requirements?.currently_due ?? []).length,
          updated_at: new Date().toISOString(),
        }).eq("stripe_account_id", acct.id);
        if (error) throw error;
        return ok();
      }

      case "account.application.deauthorized": {
        if (event.account) {
          await supabaseAdmin.from("advisor_payout_accounts").update({
            transfers_active: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString(),
          }).eq("stripe_account_id", event.account);
        }
        return ok();
      }

      // Transfers are created by release-advisor-payouts; these events confirm
      // them and catch reversals made in the Stripe dashboard.
      case "transfer.created":
      case "transfer.updated":
      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        const paymentId = transfer.metadata?.payment_id;
        if (!paymentId) return ok({ skipped: "no payment_id" });
        const fullyReversed = transfer.reversed || (transfer.amount_reversed ?? 0) >= transfer.amount;
        const partlyReversed = !fullyReversed && (transfer.amount_reversed ?? 0) > 0;
        await supabaseAdmin.from("payments").update({
          stripe_transfer_id: transfer.id,
          transfer_status: fullyReversed ? "reversed" : partlyReversed ? "partially_reversed" : "paid",
          updated_at: new Date().toISOString(),
        }).eq("id", paymentId);
        return ok();
      }

      // Money leaving an advisor's Stripe account for their bank. Logged for
      // support; advisors see these in their Express dashboard.
      case "payout.paid":
      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`Advisor payout ${event.type}`, event.account, payout.id, payout.amount, payout.currency, payout.failure_code ?? "");
        return ok();
      }

      default:
        return ok({ skipped: event.type });
    }
  } catch (err) {
    console.error("Webhook handler error:", event.type, err);
    // Non-2xx makes Stripe retry with backoff - every handler above is idempotent.
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
