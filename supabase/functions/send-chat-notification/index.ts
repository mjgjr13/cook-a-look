import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  SITE_URL, advisorTimeZone, button, callout, clientTimeZone, escapeHtml, heading, paragraph,
  renderEmail, sendEmail,
} from "../_shared/emailLayout.ts";

interface ChatNotificationRequest {
  bookingId: string;
  messagePreview: string;
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

  try {
    const { bookingId, messagePreview }: ChatNotificationRequest = await req.json();

    if (!bookingId || typeof messagePreview !== "string") {
      return new Response(JSON.stringify({ error: "Missing bookingId or messagePreview" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the authorization header to identify the sender
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const senderId = userData.user.id;

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id, client_timezone,
        client:profiles!bookings_client_id_fkey(id, user_id, full_name, email, timezone),
        advisor:profiles!bookings_advisor_id_fkey(id, user_id, full_name, email, timezone),
        slot:availability_slots(start_time)
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

    // Type assertions for joined data
    const client = booking.client as unknown as { id: string; user_id: string; full_name: string; email: string; timezone: string | null } | null;
    const advisor = booking.advisor as unknown as { id: string; user_id: string; full_name: string; email: string; timezone: string | null } | null;
    const slot = booking.slot as unknown as { start_time: string } | null;

    // Determine who should receive the notification (the other participant)
    const isClient = client?.user_id === senderId;
    const isAdvisor = advisor?.user_id === senderId;

    if (!isClient && !isAdvisor) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Send notification to the other participant
    const recipient = isClient ? advisor : client;
    const sender = isClient ? client : advisor;
    const recipientRole = isClient ? "advisor" : "client";

    if (!recipient?.email) {
      console.log("No recipient email found, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Respect the suppression list (unsubscribes, bounces, complaints)
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .in("email", [recipient.email, recipient.email.toLowerCase()])
      .limit(1);

    if (suppressed && suppressed.length > 0) {
      console.log("Recipient email is suppressed, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const recipientTz = recipientRole === "advisor"
      ? await advisorTimeZone(supabaseAdmin, advisor)
      : clientTimeZone(booking as { client_timezone?: string | null }, client);
    const sessionDate = slot?.start_time ? new Date(slot.start_time) : new Date();
    const formattedDate = sessionDate.toLocaleDateString("en-US", {
      timeZone: recipientTz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // HTML-escape user-controlled values before email interpolation
    const rawPreview = messagePreview.length > 100
      ? messagePreview.substring(0, 100) + "..."
      : messagePreview;
    const preview = escapeHtml(rawPreview);
    const senderName = escapeHtml(sender?.full_name || "your contact");

    const dashboardUrl = recipientRole === "advisor" 
      ? `${SITE_URL}/advisor`
      : `${SITE_URL}/dashboard`;

    const emailHtml = renderEmail({
      title: `New message from ${sender?.full_name || "your contact"}`,
      preheader: rawPreview,
      body: [
        heading(`New message from ${senderName}`),
        paragraph(`You have a new message about your ${escapeHtml(formattedDate)} consultation:`),
        callout(`&ldquo;${preview}&rdquo;`),
        button("View full conversation", dashboardUrl),
      ].join(""),
      footer: "You're receiving this because you have an active booking on Cook A Look.",
    });

    await sendEmail({
      to: recipient.email,
      subject: `New message from ${sender?.full_name || "your contact"}`.slice(0, 200),
      html: emailHtml,
      throwOnError: true,
    });

    console.log(`Chat notification sent to ${recipientRole}:`, recipient.email);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Send chat notification error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
