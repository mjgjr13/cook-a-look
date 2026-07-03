import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type SupabaseAdmin = ReturnType<typeof createClient>;

export interface ConfirmResult {
  bookingId: string;
  totalPaid: number;
  taxPaid: number;
  alreadyProcessed: boolean;
}

/**
 * Confirms a paid Stripe checkout session: marks the booking confirmed and
 * records the payment (with platform fee + 48h escrow). Idempotent — safe to
 * call for the same session from both the webhook and the client success
 * page, since the unique index on stripe_checkout_session_id makes the
 * insert the single source of truth for "already processed".
 */
export async function confirmPaidCheckoutSession(
  supabaseAdmin: SupabaseAdmin,
  session: Stripe.Checkout.Session,
): Promise<ConfirmResult> {
  const sessionId = session.id;

  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("booking_id, total_amount, tax_amount")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existingPayment) {
    return {
      bookingId: existingPayment.booking_id as string,
      totalPaid: Number(existingPayment.total_amount),
      taxPaid: Number(existingPayment.tax_amount ?? 0),
      alreadyProcessed: true,
    };
  }

  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed");
  }

  const advisorId = session.metadata?.advisor_id;
  const bookingId = session.metadata?.booking_id;
  const clientUserId = session.metadata?.client_user_id;
  if (!advisorId || !bookingId || !clientUserId) {
    throw new Error("Missing metadata");
  }

  const { data: clientProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", clientUserId)
    .single();
  if (!clientProfile) throw new Error("Client profile not found");

  const { error: confirmError } = await supabaseAdmin.rpc("confirm_paid_booking", {
    p_booking_id: bookingId,
    p_client_id: clientProfile.id,
  });
  if (confirmError) throw confirmError;

  const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
  const taxAmount = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;
  const baseAmount = totalAmount - taxAmount;
  const platformFee = Number((baseAmount * 0.15).toFixed(2));
  const advisorPayout = Number((baseAmount * 0.85).toFixed(2));
  const escrowReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin.from("payments").insert({
    booking_id: bookingId,
    client_id: clientProfile.id,
    advisor_id: advisorId,
    amount: baseAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    platform_fee: platformFee,
    advisor_payout: advisorPayout,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id,
    status: "completed",
    escrow_status: "held",
    escrow_release_at: escrowReleaseAt,
  });

  if (insertError) {
    // Unique-violation means the other path (webhook vs. client) won the race
    // and already recorded this session - treat as already processed.
    if (insertError.code === "23505") {
      const { data: raceWinner } = await supabaseAdmin
        .from("payments")
        .select("booking_id, total_amount, tax_amount")
        .eq("stripe_checkout_session_id", sessionId)
        .single();
      if (raceWinner) {
        return {
          bookingId: raceWinner.booking_id as string,
          totalPaid: Number(raceWinner.total_amount),
          taxPaid: Number(raceWinner.tax_amount ?? 0),
          alreadyProcessed: true,
        };
      }
    }
    throw insertError;
  }

  return { bookingId, totalPaid: totalAmount, taxPaid: taxAmount, alreadyProcessed: false };
}
