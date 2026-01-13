import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sessionId } = await req.json();
    
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

    // Record the payment
    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
    const taxAmount = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;

    await supabaseClient.from("payments").insert({
      booking_id: booking.id,
      client_id: clientProfile.id,
      advisor_id: advisorId,
      amount: totalAmount - taxAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
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
