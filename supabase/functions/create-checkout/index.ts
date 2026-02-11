import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Input validation using simple regex and type checks
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidISO8601 = (str: string): boolean => {
  const date = new Date(str);
  return !isNaN(date.getTime());
};

interface CheckoutRequest {
  advisorId: string;
  slotId?: string; // Optional for dynamic slots
  slotStartTime?: string; // For dynamic slot creation
  slotEndTime?: string; // For dynamic slot creation
  sessionDate: string;
  sessionTime: string;
  isDynamicSlot?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Use service role to fetch advisor data securely
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  try {
    const body = await req.json();
    const { advisorId, slotId, slotStartTime, slotEndTime, sessionDate, sessionTime, isDynamicSlot } = body as CheckoutRequest;

    // Validate advisor ID
    if (!isValidUUID(advisorId)) {
      throw new Error("Invalid advisor ID format");
    }

    // For legacy slots, validate slotId
    if (!isDynamicSlot && slotId && !isValidUUID(slotId)) {
      throw new Error("Invalid slot ID format");
    }

    // For dynamic slots, validate time strings
    if (isDynamicSlot) {
      if (!slotStartTime || !slotEndTime || !isValidISO8601(slotStartTime) || !isValidISO8601(slotEndTime)) {
        throw new Error("Invalid slot time format");
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      throw new Error("User not authenticated");
    }
    
    const user = {
      id: claimsData.claims.sub as string,
      email: claimsData.claims.email as string,
    };
    
    if (!user.email) {
      throw new Error("User not authenticated");
    }

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

    let finalSlotId: string;
    let finalStartTime: string;
    let finalEndTime: string;

    if (isDynamicSlot && slotStartTime && slotEndTime) {
      // Dynamic slot: verify availability and create the slot
      finalStartTime = slotStartTime;
      finalEndTime = slotEndTime;

      // Verify slot is in the future
      if (new Date(finalStartTime) <= new Date()) {
        throw new Error("Cannot book a past time slot");
      }

      // Verify no overlapping booked slots exist (including buffer)
      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from("availability_slots")
        .select("id")
        .eq("advisor_id", advisorId)
        .eq("is_booked", true)
        .lt("start_time", new Date(new Date(finalEndTime).getTime() + 15 * 60 * 1000).toISOString())
        .gt("end_time", new Date(new Date(finalStartTime).getTime() - 15 * 60 * 1000).toISOString());

      if (conflictError) {
        console.error("Conflict check error:", conflictError);
        throw new Error("Failed to verify slot availability");
      }

      if (conflicts && conflicts.length > 0) {
        throw new Error("This time slot is no longer available");
      }

      // Verify the slot is within advisor's availability window
      const slotDate = new Date(finalStartTime);
      const dayOfWeek = slotDate.getUTCDay();

      const { data: availWindow, error: windowError } = await supabaseAdmin
        .from("advisor_availability_windows")
        .select("start_time, end_time")
        .eq("advisor_id", advisorId)
        .eq("day_of_week", dayOfWeek)
        .single();

      if (windowError || !availWindow) {
        throw new Error("Advisor is not available on this day");
      }

      // Check times are within window (comparing just the time part)
      const slotStartHour = slotDate.getUTCHours();
      const slotStartMinutes = slotDate.getUTCMinutes();
      const slotStartTimeStr = `${slotStartHour.toString().padStart(2, "0")}:${slotStartMinutes.toString().padStart(2, "0")}:00`;

      const slotEndDate = new Date(finalEndTime);
      const slotEndHour = slotEndDate.getUTCHours();
      const slotEndMinutes = slotEndDate.getUTCMinutes();
      const slotEndTimeStr = `${slotEndHour.toString().padStart(2, "0")}:${slotEndMinutes.toString().padStart(2, "0")}:00`;

      if (slotStartTimeStr < availWindow.start_time || slotEndTimeStr > availWindow.end_time) {
        throw new Error("Selected time is outside advisor's available hours");
      }

      // Create the slot dynamically
      const { data: newSlot, error: createError } = await supabaseAdmin
        .from("availability_slots")
        .insert({
          advisor_id: advisorId,
          start_time: finalStartTime,
          end_time: finalEndTime,
          is_virtual: true,
          is_booked: false,
        })
        .select("id")
        .single();

      if (createError || !newSlot) {
        console.error("Slot creation error:", createError);
        throw new Error("Failed to create booking slot");
      }

      finalSlotId = newSlot.id;
    } else if (slotId) {
      // Legacy slot: verify existing slot
      const { data: slot, error: slotError } = await supabaseAdmin
        .from("availability_slots")
        .select("id, advisor_id, is_booked, start_time, end_time")
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

      if (new Date(slot.start_time) <= new Date()) {
        throw new Error("Cannot book a past time slot");
      }

      finalSlotId = slot.id;
      finalStartTime = slot.start_time;
      finalEndTime = slot.end_time;
    } else {
      throw new Error("No slot information provided");
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

    const origin = req.headers.get("origin") || "https://cookalookcom.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Style Consultation with ${advisorName}`,
              description: `${sessionDate} at ${sessionTime} - Virtual styling session`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&advisor_id=${advisorId}&slot_id=${finalSlotId}`,
      cancel_url: `${origin}/advisors/${advisorId}`,
      metadata: {
        advisor_id: advisorId,
        slot_id: finalSlotId,
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
