import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface Req {
  bookingId: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Cook A Look <onboarding@resend.dev>", to, subject, html }),
    });
  } catch (e) {
    console.error("email_failed", e);
  }
}

serve(async (req) => {
  const pre = handleCorsPreflightRequest(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req.headers.get("origin"));

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData } = await anon.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { bookingId } = (await req.json()) as Req;
    if (!bookingId) return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, status, refund_status, refund_amount_cents, refund_percentage, cancelled_by, advisor_id, client_id, advisor:profiles!bookings_advisor_id_fkey(full_name, user_id), client:profiles!bookings_client_id_fkey(full_name, user_id)")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) return new Response(JSON.stringify({ error: "booking_not_found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    // Authorization: caller must be a participant of this booking, or an admin
    const callerId = userData.user.id;
    const isClientCaller = (booking.client as { user_id?: string } | null)?.user_id === callerId;
    const isAdvisorCaller = (booking.advisor as { user_id?: string } | null)?.user_id === callerId;
    let isAdmin = false;
    if (!isClientCaller && !isAdvisorCaller) {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }
    if (!isClientCaller && !isAdvisorCaller && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (booking.status !== "cancelled") {
      return new Response(JSON.stringify({ error: "not_cancelled" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (booking.refund_status === "succeeded" || booking.refund_status === "voided") {
      return new Response(JSON.stringify({ ok: true, message: "already_processed" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: payment } = await admin
      .from("payments")
      .select("id, stripe_payment_intent_id, total_amount, currency, status")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let refundResult: { status: string; refund_id?: string; details: Record<string, unknown> } = {
      status: "voided",
      details: { reason: "no_payment_or_amount_zero" },
    };

    if (stripeKey && payment?.stripe_payment_intent_id && (booking.refund_amount_cents ?? 0) > 0) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      try {
        const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        if (intent.status === "requires_capture" || intent.status === "requires_payment_method" || intent.status === "requires_confirmation") {
          const cancelled = await stripe.paymentIntents.cancel(intent.id);
          refundResult = { status: "voided", refund_id: cancelled.id, details: { voided: true } };
        } else {
          const refund = await stripe.refunds.create(
            {
              payment_intent: payment.stripe_payment_intent_id,
              amount: booking.refund_amount_cents!,
              reason: "requested_by_customer",
              metadata: { booking_id: bookingId, cancelled_by: booking.cancelled_by ?? "unknown" },
            },
            { idempotencyKey: `refund:${bookingId}` }
          );
          refundResult = { status: refund.status === "succeeded" ? "succeeded" : "processing", refund_id: refund.id, details: { stripe_status: refund.status } };
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("stripe_refund_failed", msg);
        refundResult = { status: "failed", details: { error: msg } };
      }
    } else if ((booking.refund_amount_cents ?? 0) === 0) {
      refundResult = { status: "none", details: { reason: "zero_refund_per_policy" } };
    }

    await admin.rpc("mark_refund_result", {
      p_booking_id: bookingId,
      p_status: refundResult.status,
      p_refund_id: refundResult.refund_id ?? null,
      p_details: refundResult.details,
    });

    // Emails (best-effort)
    const clientUserId = (booking.client as { user_id?: string } | null)?.user_id;
    const advisorUserId = (booking.advisor as { user_id?: string } | null)?.user_id;
    let clientEmail: string | null = null;
    let advisorEmail: string | null = null;
    if (clientUserId) {
      const { data } = await admin.auth.admin.getUserById(clientUserId);
      clientEmail = data.user?.email ?? null;
    }
    if (advisorUserId) {
      const { data } = await admin.auth.admin.getUserById(advisorUserId);
      advisorEmail = data.user?.email ?? null;
    }

    const pct = booking.refund_percentage ?? 0;
    const refundDollars = ((booking.refund_amount_cents ?? 0) / 100).toFixed(2);
    const currency = (payment?.currency ?? "usd").toUpperCase();
    const cancelledBy = booking.cancelled_by ?? "system";

    if (clientEmail) {
      const subject =
        cancelledBy === "advisor"
          ? "Your Cook A Look booking was cancelled — full refund issued"
          : "Your Cook A Look booking has been cancelled";
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF8F5;color:#1f1f1f;">
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 16px;">Booking Cancelled</h1>
          <p>Your consultation has been cancelled${cancelledBy === "advisor" ? " by your advisor" : ""}.</p>
          <p><strong>Refund:</strong> ${pct}% — ${refundDollars} ${currency}</p>
          <p style="color:#555;font-size:14px;">${refundResult.status === "succeeded" ? "Your refund has been issued and will appear on your statement within 5–10 business days." : refundResult.status === "voided" ? "The pending charge has been released — no funds were captured." : refundResult.status === "failed" ? "Your refund is being reviewed by our team — we'll be in touch shortly." : refundResult.status === "none" ? "Per the cancellation policy, no refund is due." : "Your refund is processing."}</p>
        </div>`;
      await sendEmail(clientEmail, subject, html);
    }
    if (advisorEmail) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FAF8F5;color:#1f1f1f;">
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:24px;margin:0 0 16px;">Booking Cancelled</h1>
          <p>The booking has been cancelled${cancelledBy === "client" ? " by the client" : cancelledBy === "advisor" ? " (by you)" : ""}.</p>
          <p>Client refund: ${pct}% (${refundDollars} ${currency}).</p>
          <p style="color:#555;font-size:14px;">The time slot has been freed.</p>
        </div>`;
      await sendEmail(advisorEmail, "Booking cancelled — Cook A Look", html);
    }

    return new Response(JSON.stringify({ ok: true, refund_status: refundResult.status, refund_id: refundResult.refund_id ?? null }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-booking-cancellation error", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
