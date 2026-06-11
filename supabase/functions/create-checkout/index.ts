import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

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
  slotId?: string;
  slotStartTime?: string;
  slotEndTime?: string;
  sessionDate: string;
  sessionTime: string;
  isDynamicSlot?: boolean;
  hours?: number;
  meetingType?: "virtual" | "in_person";
  locationId?: string | null;
  suggestedLocation?: { name?: string; address?: string; note?: string } | null;
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

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
    const {
      advisorId, slotId, slotStartTime, slotEndTime, sessionDate, sessionTime, isDynamicSlot,
      hours: rawHours, meetingType: rawMeetingType, locationId, suggestedLocation,
    } = body as CheckoutRequest;

    const hours = Number.isInteger(rawHours) && rawHours! >= 1 && rawHours! <= 3 ? rawHours! : 1;
    const meetingType: "virtual" | "in_person" = rawMeetingType === "in_person" ? "in_person" : "virtual";

    if (!isValidUUID(advisorId)) throw new Error("Invalid advisor ID format");
    if (!isDynamicSlot && slotId && !isValidUUID(slotId)) throw new Error("Invalid slot ID format");
    if (isDynamicSlot) {
      if (!slotStartTime || !slotEndTime || !isValidISO8601(slotStartTime) || !isValidISO8601(slotEndTime)) {
        throw new Error("Invalid slot time format");
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("User not authenticated");
    const user = userData.user;
    if (!user.email) throw new Error("User email not available");

    // Fetch advisor with capabilities + surcharge
    const { data: advisor, error: advisorError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, price_per_session, is_advisor, advisor_approved, virtual_available, in_person_available, in_person_surcharge")
      .eq("id", advisorId)
      .single();
    if (advisorError || !advisor) throw new Error("Advisor not found");
    if (!advisor.is_advisor || !advisor.advisor_approved) throw new Error("Invalid advisor");
    if (!advisor.price_per_session || advisor.price_per_session <= 0) throw new Error("Advisor has not set a valid price");

    if (meetingType === "virtual" && !advisor.virtual_available) throw new Error("Advisor does not offer virtual sessions");
    if (meetingType === "in_person" && !advisor.in_person_available) throw new Error("Advisor does not offer in-person sessions");

    // Validate location for in-person
    let validatedLocationId: string | null = null;
    let validatedSuggested: { name: string; address: string; note?: string } | null = null;
    if (meetingType === "in_person") {
      if (locationId) {
        const { data: loc } = await supabaseAdmin
          .from("advisor_meeting_locations")
          .select("id")
          .eq("id", locationId)
          .eq("advisor_id", advisorId)
          .eq("is_active", true)
          .maybeSingle();
        if (!loc) throw new Error("Invalid meeting location");
        validatedLocationId = loc.id;
      } else if (suggestedLocation && suggestedLocation.name && suggestedLocation.address) {
        validatedSuggested = {
          name: String(suggestedLocation.name).slice(0, 200),
          address: String(suggestedLocation.address).slice(0, 300),
          note: suggestedLocation.note ? String(suggestedLocation.note).slice(0, 300) : undefined,
        };
      } else {
        throw new Error("Meeting location required for in-person session");
      }
    }

    const surchargeDollars = meetingType === "in_person"
      ? Math.max(0, Math.min(100, advisor.in_person_surcharge ?? 0))
      : 0;

    // Resolve times
    let finalStartTime: string;
    let finalEndTime: string;
    let finalIsVirtual = meetingType === "virtual";

    if (isDynamicSlot && slotStartTime && slotEndTime) {
      finalStartTime = slotStartTime;
      finalEndTime = slotEndTime;
    } else if (slotId) {
      const { data: slot, error: slotError } = await supabaseAdmin
        .from("availability_slots")
        .select("advisor_id, is_booked, start_time, end_time, is_virtual")
        .eq("id", slotId)
        .single();
      if (slotError || !slot) throw new Error("Time slot not found");
      if (slot.advisor_id !== advisorId) throw new Error("Slot does not belong to this advisor");
      if (slot.is_booked) throw new Error("This time slot is no longer available");
      finalStartTime = slot.start_time;
      finalEndTime = slot.end_time;
    } else {
      throw new Error("No slot information provided");
    }

    if (new Date(finalStartTime) <= new Date()) throw new Error("Cannot book a past time slot");

    const surchargeCents = Math.round(surchargeDollars * 100);

    const { data: booked, error: bookError } = await supabaseAdmin.rpc("book_slot", {
      p_advisor_id: advisorId,
      p_client_user_id: user.id,
      p_start_time: finalStartTime,
      p_end_time: finalEndTime,
      p_is_virtual: finalIsVirtual,
      p_meeting_type: meetingType,
      p_location_id: validatedLocationId,
      p_suggested_location: validatedSuggested,
      p_surcharge_cents: surchargeCents,
    });

    if (bookError) {
      console.error("book_slot error:", bookError);
      const msg = bookError.message || "";
      const taken = /slot_taken|unique|duplicate/i.test(msg);
      return new Response(
        JSON.stringify({ error: taken ? "This time slot was just booked. Please pick another." : msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: taken ? 409 : 500 }
      );
    }

    const row = Array.isArray(booked) ? booked[0] : booked;
    const finalSlotId: string = row?.slot_id;
    const pendingBookingId: string = row?.booking_id;
    if (!finalSlotId || !pendingBookingId) throw new Error("Booking creation failed");

    await supabaseAdmin
      .from("bookings")
      .update({ duration_hours: hours })
      .eq("id", pendingBookingId);

    const hourlyRate = advisor.price_per_session;
    const amount = hourlyRate * hours + surchargeDollars;
    const advisorName = advisor.full_name || "Style Advisor";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = req.headers.get("origin") || "https://cookalook.lovable.app";
    const sessionTypeLabel = meetingType === "in_person" ? "in-person" : "virtual";
    const descriptionParts = [
      `${sessionDate} at ${sessionTime}`,
      `${hours}-hour ${sessionTypeLabel} styling session ($${hourlyRate}/hour)`,
    ];
    if (surchargeDollars > 0) descriptionParts.push(`+ $${surchargeDollars} in-person surcharge`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Style Consultation with ${advisorName}`,
            description: descriptionParts.join(" — "),
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&advisor_id=${advisorId}&slot_id=${finalSlotId}`,
      cancel_url: `${origin}/advisors/${advisorId}`,
      metadata: {
        advisor_id: advisorId,
        slot_id: finalSlotId,
        booking_id: pendingBookingId,
        client_user_id: user.id,
        hours: String(hours),
        meeting_type: meetingType,
        surcharge_cents: String(surchargeCents),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError = /authorization|authenticated|auth|email not available/i.test(errorMessage);
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isAuthError ? 401 : 500,
    });
  }
});
