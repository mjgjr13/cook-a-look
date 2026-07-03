import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { confirmPaidCheckoutSession } from "../_shared/confirmPayment.ts";

// Server-to-server endpoint: Stripe calls this directly, not the browser.
// No CORS handling and no Supabase JWT - authenticity is verified via the
// Stripe signature below. This is the durable backstop for the client's
// own verify-payment call on the success page: if the browser never gets
// there (closed tab, crash, lost network), this still confirms the booking.
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, skipped: event.type }), { status: 200 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await confirmPaidCheckoutSession(supabaseAdmin, session);
    console.log("Webhook confirmed session:", session.id, result);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Non-2xx makes Stripe retry with backoff - safe, since confirmPaidCheckoutSession is idempotent.
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
