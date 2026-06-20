import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface ChatNotificationRequest {
  bookingId: string;
  messagePreview: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Cook A Look <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
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

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Missing bookingId" }), {
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
        id,
        client:profiles!bookings_client_id_fkey(id, user_id, full_name, email),
        advisor:profiles!bookings_advisor_id_fkey(id, user_id, full_name, email),
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
    const client = booking.client as unknown as { id: string; user_id: string; full_name: string; email: string } | null;
    const advisor = booking.advisor as unknown as { id: string; user_id: string; full_name: string; email: string } | null;
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

    const sessionDate = slot?.start_time ? new Date(slot.start_time) : new Date();
    const formattedDate = sessionDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Truncate message preview
    const preview = messagePreview.length > 100 
      ? messagePreview.substring(0, 100) + "..." 
      : messagePreview;

    const dashboardUrl = recipientRole === "advisor" 
      ? "https://cookalookcom.lovable.app/advisor" 
      : "https://cookalookcom.lovable.app/dashboard";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 500; letter-spacing: 2px; }
            .message-box { background: #f9f8f6; padding: 20px; border-left: 3px solid #8b7355; margin: 20px 0; }
            .message-preview { font-style: italic; color: #555; }
            .cta-button { 
              display: inline-block; 
              background: #1a1a1a; 
              color: white !important; 
              padding: 12px 24px; 
              text-decoration: none; 
              margin: 20px 0;
            }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COOK A LOOK</div>
            </div>
            
            <h2 style="font-weight: 400;">New Message from ${sender?.full_name || "your contact"}</h2>
            
            <p>You have a new message regarding your ${formattedDate} consultation:</p>
            
            <div class="message-box">
              <p class="message-preview">"${preview}"</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="cta-button">View Full Conversation</a>
            </p>
            
            <div class="footer">
              <p>You're receiving this because you have an active booking on Cook A Look.</p>
              <p>&copy; ${new Date().getFullYear()} Cook A Look. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail(
      recipient.email,
      `New message from ${sender?.full_name || "your contact"}`,
      emailHtml
    );

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
