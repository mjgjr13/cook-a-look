import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, getSafeOrigin, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { isTestBookableAdvisor } from "../_shared/testMode.ts";

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
  corporate?: {
    format?: "virtual" | "on_site";
    date?: string;
    groupSize?: number;
    company?: string;
    location?: string;
    about?: string;
  } | null;
}

// Corporate engagements: 3-hour virtual block, or the advisor's whole day on site.
const CORPORATE_VIRTUAL_HOURS = 3;

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
      hours: rawHours, meetingType: rawMeetingType, locationId, suggestedLocation, corporate: rawCorporate,
    } = body as CheckoutRequest;

    const isCorporate = !!rawCorporate;
    const corporateFormat: "virtual" | "on_site" = rawCorporate?.format === "on_site" ? "on_site" : "virtual";
    const hours = isCorporate
      ? CORPORATE_VIRTUAL_HOURS
      : Number.isInteger(rawHours) && rawHours! >= 1 && rawHours! <= 3 ? rawHours! : 1;
    const meetingType: "virtual" | "in_person" = isCorporate
      ? (corporateFormat === "on_site" ? "in_person" : "virtual")
      : rawMeetingType === "in_person" ? "in_person" : "virtual";

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
      .select("id, full_name, price_per_session, is_advisor, advisor_approved, is_demo, virtual_available, in_person_available, in_person_surcharge, offers_corporate, corporate_virtual_rate, corporate_in_person_rate")
      .eq("id", advisorId)
      .single();
    if (advisorError || !advisor) throw new Error("Advisor not found");
    if (!advisor.is_advisor || !advisor.advisor_approved) throw new Error("Invalid advisor");
    // Sample (demo) profiles can't be booked or paid for - the site shows a waitlist instead.
    // Exception: designated test advisors stay bookable while Stripe uses TEST keys, so the
    // full booking/payment/video flow can be tested. Switching to live keys blocks them.
    if (advisor.is_demo && !isTestBookableAdvisor(advisor.id)) {
      throw new Error("This is a sample profile and can't be booked yet");
    }
    // Corporate: validate the request and the advisor's corporate rate.
    let corporateRate = 0;
    let corporateDetails: Record<string, unknown> | null = null;
    if (isCorporate) {
      if (!advisor.offers_corporate) throw new Error("This advisor doesn't offer corporate services");
      const rate = corporateFormat === "on_site" ? advisor.corporate_in_person_rate : advisor.corporate_virtual_rate;
      if (!rate || rate <= 0) throw new Error("This advisor doesn't offer that corporate format");
      corporateRate = rate;
      const groupSize = Number(rawCorporate?.groupSize);
      const company = String(rawCorporate?.company ?? "").trim().slice(0, 200);
      const location = String(rawCorporate?.location ?? "").trim().slice(0, 300);
      const about = String(rawCorporate?.about ?? "").trim().slice(0, 2000);
      if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) throw new Error("Please enter a valid group size");
      if (!company) throw new Error("Please enter your company or organization");
      if (corporateFormat === "on_site" && location.length < 5) throw new Error("Please enter the session address");
      if (about.length < 10) throw new Error("Please tell the advisor what you're looking for");
      corporateDetails = { format: corporateFormat, group_size: groupSize, company, location: location || null, about };
    } else {
      if (!advisor.price_per_session || advisor.price_per_session <= 0) throw new Error("Advisor has not set a valid price");
      if (meetingType === "virtual" && !advisor.virtual_available) throw new Error("Advisor does not offer virtual sessions");
      if (meetingType === "in_person" && !advisor.in_person_available) throw new Error("Advisor does not offer in-person sessions");
    }

    // Validate location for in-person
    let validatedLocationId: string | null = null;
    let validatedSuggested: { name: string; address: string; note?: string } | null = null;
    if (isCorporate && meetingType === "in_person") {
      // On-site corporate: the company's address (book_slot needs a location;
      // it's marked confirmed after booking since the advisor offers on-site work).
      validatedSuggested = {
        name: String(corporateDetails?.company ?? "On-site session").slice(0, 200),
        address: String(corporateDetails?.location ?? "").slice(0, 300),
      };
    } else if (meetingType === "in_person") {
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

    const surchargeDollars = !isCorporate && meetingType === "in_person"
      ? Math.max(0, Math.min(100, advisor.in_person_surcharge ?? 0))
      : 0;

    // Resolve times
    let finalStartTime: string;
    let finalEndTime: string;
    let finalIsVirtual = meetingType === "virtual";

    if (isCorporate && corporateFormat === "on_site") {
      // Whole day: times come from the server-side availability check, never the client.
      const date = String(rawCorporate?.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
      const { data: day, error: dayError } = await supabaseAdmin.rpc("get_corporate_full_day", {
        p_advisor_id: advisorId,
        p_date: date,
      });
      const dayRow = Array.isArray(day) ? day[0] : null;
      if (dayError || !dayRow) {
        return new Response(
          JSON.stringify({ error: "That day is no longer fully available. Please pick another." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
      finalStartTime = dayRow.day_start;
      finalEndTime = dayRow.day_end;
      finalIsVirtual = false;
    } else if (isCorporate && isDynamicSlot && slotStartTime) {
      // Virtual corporate: always exactly 3 hours from the chosen start.
      finalStartTime = slotStartTime;
      finalEndTime = new Date(new Date(slotStartTime).getTime() + CORPORATE_VIRTUAL_HOURS * 3600_000).toISOString();
    } else if (isDynamicSlot && slotStartTime && slotEndTime) {
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

    if (isCorporate) {
      const { error: corpUpdateError } = await supabaseAdmin
        .from("bookings")
        .update({
          duration_hours: hours,
          is_corporate: true,
          corporate_details: corporateDetails,
          ...(meetingType === "in_person"
            ? { location_status: "confirmed", location_snapshot: validatedSuggested, suggested_location: null }
            : {}),
        })
        .eq("id", pendingBookingId);
      if (corpUpdateError) {
        console.error("corporate booking update error:", corpUpdateError);
        // Release the held time so it isn't blocked by a booking we can't complete.
        await supabaseAdmin.from("bookings").update({ status: "cancelled" }).eq("id", pendingBookingId);
        await supabaseAdmin.from("availability_slots").update({ is_booked: false }).eq("id", finalSlotId);
        throw new Error("Corporate booking could not be created. Please try again.");
      }
    } else {
      await supabaseAdmin
        .from("bookings")
        .update({ duration_hours: hours })
        .eq("id", pendingBookingId);
    }

    const hourlyRate = advisor.price_per_session;
    const amount = isCorporate ? corporateRate : hourlyRate * hours + surchargeDollars;
    const advisorName = advisor.full_name || "Style Advisor";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const origin = getSafeOrigin(req.headers.get("origin"));
    const sessionTypeLabel = meetingType === "in_person" ? "in-person" : "virtual";
    const descriptionParts = isCorporate
      ? [
          sessionDate,
          corporateFormat === "on_site"
            ? "Corporate on-site day"
            : `Corporate ${CORPORATE_VIRTUAL_HOURS}-hour virtual session`,
        ]
      : [
          `${sessionDate} at ${sessionTime}`,
          `${hours}-hour ${sessionTypeLabel} styling session ($${hourlyRate}/hour)`,
        ];
    if (surchargeDollars > 0) descriptionParts.push(`+ $${surchargeDollars} in-person surcharge`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      ...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: isCorporate ? `Corporate Image Consulting with ${advisorName}` : `Style Consultation with ${advisorName}`,
            description: descriptionParts.join(" — "),
            tax_code: "txcd_20030000",
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
        is_corporate: isCorporate ? "true" : "false",
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
