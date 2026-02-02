import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Validate Stripe session ID format
const isValidStripeSessionId = (id: string): boolean => {
  return typeof id === "string" && id.startsWith("cs_") && id.length > 10 && id.length < 200;
};

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();

    // SECURITY: Validate session ID format
    if (!sessionId || !isValidStripeSessionId(sessionId)) {
      return new Response(JSON.stringify({ error: "Invalid session ID format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // SECURITY: Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if this session has already been processed (prevent replay attacks)
    const { data: existingPayment } = await supabaseClient
      .from("payments")
      .select("id")
      .eq("stripe_checkout_session_id", sessionId)
      .single();

    if (existingPayment) {
      // Already processed - return success but don't create duplicate
      console.log("Payment already processed for session:", sessionId);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        alreadyProcessed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const advisorId = session.metadata?.advisor_id;
    const slotId = session.metadata?.slot_id;
    const clientUserId = session.metadata?.client_user_id;

    if (!advisorId || !slotId || !clientUserId) {
      throw new Error("Missing metadata");
    }

    // SECURITY: Verify the caller is the client who made this payment
    if (clientUserId !== authData.user.id) {
      console.error("User mismatch:", { clientUserId, callerId: authData.user.id });
      return new Response(JSON.stringify({ error: "Unauthorized access to this payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get client's profile
    const { data: clientProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", clientUserId)
      .single();

    if (!clientProfile) throw new Error("Client profile not found");

    // Create the booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        advisor_id: advisorId,
        client_id: clientProfile.id,
        slot_id: slotId,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Mark slot as booked
    await supabaseClient
      .from("availability_slots")
      .update({ is_booked: true })
      .eq("id", slotId);

    // Record the payment with platform fee breakdown
    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
    const taxAmount = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;
    const baseAmount = totalAmount - taxAmount;
    
    // Calculate 15% platform fee and 85% advisor payout
    const platformFee = Number((baseAmount * 0.15).toFixed(2));
    const advisorPayout = Number((baseAmount * 0.85).toFixed(2));

    await supabaseClient.from("payments").insert({
      booking_id: booking.id,
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
    });

    return new Response(JSON.stringify({ 
      success: true, 
      bookingId: booking.id,
      totalPaid: totalAmount,
      taxPaid: taxAmount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
