import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getOrCreateVideoRoomForBooking } from "../_shared/daily.ts";
import {
  SITE_URL, advisorTimeZone, button, clientTimeZone, detailRows, escapeHtml, formatDate,
  formatTime, heading, paragraph, renderEmail, sendEmail,
} from "../_shared/emailLayout.ts";

interface BookingConfirmationRequest {
  bookingId: string;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return globalThis.btoa(binary);
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Parse and validate input
    const { bookingId }: BookingConfirmationRequest = await req.json();

    if (!bookingId || !isValidUUID(bookingId)) {
      return new Response(JSON.stringify({ error: "Invalid booking ID format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;

    // Get booking with all details (use admin client to bypass RLS for reading)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        *,
        slot:availability_slots(*),
        client:profiles!bookings_client_id_fkey(id, user_id, full_name, email, timezone),
        advisor:profiles!bookings_advisor_id_fkey(id, user_id, full_name, email, specialty, price_per_session, timezone)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Authorization check: Only client or advisor can trigger confirmation email
    const isClient = booking.client?.user_id === userId;
    const isAdvisor = booking.advisor?.user_id === userId;

    if (!isClient && !isAdvisor) {
      console.error("Authorization failed: user", userId, "is neither client nor advisor for booking", bookingId);
      return new Response(JSON.stringify({ error: "Not authorized for this booking" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Each person sees the time in their own zone.
    const clientTz = clientTimeZone(booking, booking.client);
    const advisorTz = await advisorTimeZone(supabaseAdmin, booking.advisor);
    const start = booking.slot.start_time;

    // Pre-create the video room so both parties get a join link in their email
    let videoJoinUrl: string | null = null;
    if (booking.slot.is_virtual) {
      try {
        // Rooms are private (token-based), so the email links to the dashboard,
        // where the Join Call button issues a token. Pre-creating the room here
        // still makes sure it exists before the session.
        await getOrCreateVideoRoomForBooking(supabaseAdmin, bookingId);
        videoJoinUrl = `${SITE_URL}/signin`;
      } catch (e) {
        console.error("Pre-create video room failed:", e);
      }
    }

    // Calendar invite (times in UTC, which every calendar converts to the viewer's zone)
    const icsContent = generateICS({
      uid: `${bookingId}@cookalook.com`,
      title: `Style Consultation with ${booking.advisor.full_name}`,
      description: `Styling session with ${booking.advisor.full_name} (${booking.advisor.specialty ?? "Style Advisor"})`,
      startTime: booking.slot.start_time,
      endTime: booking.slot.end_time,
      isVirtual: booking.slot.is_virtual,
      joinUrl: videoJoinUrl,
    });
    const attachments = [{ filename: "consultation.ics", content: encodeBase64(icsContent) }];

    const sessionType = booking.slot.is_virtual ? "Virtual session" : "In person";
    const advisorName = escapeHtml(booking.advisor.full_name);
    const clientName = escapeHtml(booking.client.full_name);
    const joinBlock = videoJoinUrl
      ? button("Open your dashboard", videoJoinUrl) +
        paragraph("Sign in and press Join Call. The video room opens 15 minutes before your session.", { muted: true, center: true, small: true })
      : "";

    const clientEmailHtml = renderEmail({
      title: "Your consultation is confirmed",
      preheader: `${formatDate(start, clientTz)} at ${formatTime(start, clientTz)} with ${booking.advisor.full_name}`,
      body: [
        heading("Your consultation is confirmed"),
        paragraph(`Dear ${clientName},`),
        paragraph("Thank you for booking a style consultation. We're excited to help you elevate your personal style."),
        detailRows([
          ["Advisor", advisorName],
          ["Specialty", escapeHtml(booking.advisor.specialty ?? "Style Advisor")],
          ["Date", escapeHtml(formatDate(start, clientTz))],
          ["Time", escapeHtml(formatTime(start, clientTz))],
          ["Type", sessionType],
        ]),
        joinBlock,
        paragraph(`A calendar invite is attached. ${videoJoinUrl ? "The calendar event links to your dashboard, where you join the call." : "You'll receive the session details in your dashboard."}`),
      ].join(""),
    });

    const advisorEmailHtml = renderEmail({
      title: "New booking received",
      preheader: `${booking.client.full_name} on ${formatDate(start, advisorTz)} at ${formatTime(start, advisorTz)}`,
      body: [
        heading("New booking received"),
        paragraph(`Dear ${advisorName},`),
        paragraph("You have a new consultation booked. Here are the details:"),
        detailRows([
          ["Client", clientName],
          ["Date", escapeHtml(formatDate(start, advisorTz))],
          ["Time", escapeHtml(formatTime(start, advisorTz))],
          ["Type", sessionType],
        ]),
        joinBlock,
        paragraph("A calendar invite is attached. Please make sure you're available and prepared for the session."),
      ].join(""),
      footer: "Manage your bookings in your advisor dashboard.",
    });

    console.log("Sending confirmation emails for booking:", bookingId);
    const [clientEmail, advisorEmail] = await Promise.all([
      sendEmail({
        to: booking.client.email,
        subject: `Booking Confirmed: Style Consultation on ${formatDate(start, clientTz)}`,
        html: clientEmailHtml,
        attachments,
        throwOnError: true,
      }),
      sendEmail({
        to: booking.advisor.email,
        subject: `New Booking: ${booking.client.full_name} on ${formatDate(start, advisorTz)}`,
        html: advisorEmailHtml,
        attachments,
        throwOnError: true,
      }),
    ]);

    console.log("Emails sent successfully:", { clientEmail, advisorEmail });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Send confirmation error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// RFC 5545 text escaping
function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function generateICS({ uid, title, description, startTime, endTime, isVirtual, joinUrl }: {
  uid: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
  joinUrl?: string | null;
}) {
  // UTC ("Z") times: calendar apps show them in each attendee's own zone.
  const formatDate = (date: string | Date) =>
    new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const location = isVirtual ? (joinUrl ?? "Virtual session") : "In person";
  const fullDescription = joinUrl ? `${description}\n\nJoin: ${joinUrl}` : description;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cook A Look//Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(fullDescription)}`,
    `LOCATION:${icsText(location)}`,
    ...(joinUrl ? [`URL:${joinUrl}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
