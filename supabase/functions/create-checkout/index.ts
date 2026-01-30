import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation using simple regex and type checks
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

interface CheckoutRequest {
  advisorId: string;
  slotId: string;
  sessionDate: string;
  sessionTime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role to fetch advisor data securely
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { advisorId, slotId, sessionDate, sessionTime } = body as CheckoutRequest;

    // Validate UUIDs to prevent injection
    if (!isValidUUID(advisorId) || !isValidUUID(slotId)) {
      throw new Error("Invalid advisor or slot ID format");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !data.user?.email) {
      throw new Error("User not authenticated");
    }
    const user = data.user;

    // SECURITY: Fetch the advisor's price from database instead of trusting client input
    const { data: advisor, error: advisorError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, price_per_session, is_advisor, advisor_approved")
      .eq("id", advisorId)
      .single();

    if (advisorError || !advisor) {
      throw new Error("Advisor not found");
    }

    if (!advisor.is_advisor || !advisor.advisor_approved) {
      throw new Error("Invalid advisor");
    }

    if (!advisor.price_per_session || advisor.price_per_session <= 0) {
      throw new Error("Advisor has not set a valid price");
    }

    // SECURITY: Verify the slot belongs to this advisor and is not already booked
    const { data: slot, error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .select("id, advisor_id, is_booked, start_time")
      .eq("id", slotId)
      .single();

    if (slotError || !slot) {
      throw new Error("Time slot not found");
    }

    if (slot.advisor_id !== advisorId) {
      throw new Error("Slot does not belong to this advisor");
    }

    if (slot.is_booked) {
      throw new Error("This time slot is no longer available");
    }

    // Verify slot is in the future
    if (new Date(slot.start_time) <= new Date()) {
      throw new Error("Cannot book a past time slot");
    }

    const amount = advisor.price_per_session;
    const advisorName = advisor.full_name || "Style Advisor";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Create checkout session with Stripe Tax for dynamic tax calculation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      billing_address_collection: "required", // Required for regional tax calculation
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Style Consultation with ${advisorName}`,
              description: `${sessionDate} at ${sessionTime} - Virtual styling session`,
              tax_code: "txcd_10000000", // General - Services
            },
            unit_amount: Math.round(amount * 100),
            tax_behavior: "exclusive",
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      automatic_tax: { enabled: true }, // Enable Stripe Tax for dynamic calculation
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&advisor_id=${advisorId}&slot_id=${slotId}`,
      cancel_url: `${origin}/advisors/${advisorId}`,
      metadata: {
        advisor_id: advisorId,
        slot_id: slotId,
        client_user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
