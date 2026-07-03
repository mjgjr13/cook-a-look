import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { confirmPaidCheckoutSession } from "../_shared/confirmPayment.ts";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    const clientUserId = session.metadata?.client_user_id;
    if (!clientUserId) throw new Error("Missing metadata");

    // SECURITY: only the client who initiated this checkout can confirm it -
    // checked up front, before touching payment records, so a guessed/leaked
    // session ID can't be used to read or trigger someone else's booking.
    if (clientUserId !== authData.user.id) {
      console.error("User mismatch:", { clientUserId, callerId: authData.user.id });
      return new Response(JSON.stringify({ error: "Unauthorized access to this payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // This is the fast path for the success page; the stripe-webhook function
    // performs the same idempotent confirmation as a backstop if the browser
    // never gets here (closed tab, crash, lost network after payment).
    const result = await confirmPaidCheckoutSession(supabaseClient, session);

    return new Response(JSON.stringify({
      success: true,
      bookingId: result.bookingId,
      totalPaid: result.totalPaid,
      taxPaid: result.taxPaid,
      alreadyProcessed: result.alreadyProcessed,
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
