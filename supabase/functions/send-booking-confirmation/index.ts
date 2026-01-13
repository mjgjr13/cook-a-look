import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  bookingId: string;
}

// Simple base64 encoding for Deno
function btoa(str: string): string {
  return btoa(str);
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

async function sendEmail(to: string[], subject: string, html: string, icsContent?: string) {
  const payload: Record<string, unknown> = {
    from: "Cook a Look <onboarding@resend.dev>",
    to,
    subject,
    html,
  };

  if (icsContent) {
    payload.attachments = [
      {
        filename: "consultation.ics",
        content: encodeBase64(icsContent),
      },
    ];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { bookingId }: BookingConfirmationRequest = await req.json();

    // Get booking with all details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        slot:availability_slots(*),
        client:profiles!bookings_client_id_fkey(full_name, email),
        advisor:profiles!bookings_advisor_id_fkey(full_name, email, specialty, price_per_session)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    const sessionDate = new Date(booking.slot.start_time);
    const formattedDate = sessionDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = sessionDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Generate ICS calendar invite content
    const icsContent = generateICS({
      title: `Style Consultation with ${booking.advisor.full_name}`,
      description: `Virtual styling session with ${booking.advisor.full_name} (${booking.advisor.specialty})`,
      startTime: booking.slot.start_time,
      endTime: booking.slot.end_time,
      isVirtual: booking.slot.is_virtual,
    });

    // Send email to client
    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 500; letter-spacing: 2px; }
            .details { background: #f9f8f6; padding: 30px; margin: 30px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
            .detail-label { color: #666; }
            .detail-value { font-weight: 500; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COOK A LOOK</div>
            </div>
            
            <h1 style="text-align: center; font-weight: 400;">Your Consultation is Confirmed</h1>
            
            <p>Dear ${booking.client.full_name},</p>
            
            <p>Thank you for booking a style consultation. We're excited to help you elevate your personal style.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Advisor</span>
                <span class="detail-value">${booking.advisor.full_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Specialty</span>
                <span class="detail-value">${booking.advisor.specialty}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Type</span>
                <span class="detail-value">${booking.slot.is_virtual ? "Virtual Session" : "In-Person"}</span>
              </div>
            </div>
            
            <p>A calendar invite is attached. You'll receive a video call link before your session.</p>
            
            <div class="footer">
              <p>Questions? Reply to this email or visit our help center.</p>
              <p>&copy; ${new Date().getFullYear()} Cook a Look. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to advisor
    const advisorEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 500; letter-spacing: 2px; }
            .details { background: #f9f8f6; padding: 30px; margin: 30px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
            .detail-label { color: #666; }
            .detail-value { font-weight: 500; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COOK A LOOK</div>
            </div>
            
            <h1 style="text-align: center; font-weight: 400;">New Booking Received</h1>
            
            <p>Dear ${booking.advisor.full_name},</p>
            
            <p>You have a new consultation booked. Here are the details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Client</span>
                <span class="detail-value">${booking.client.full_name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Type</span>
                <span class="detail-value">${booking.slot.is_virtual ? "Virtual Session" : "In-Person"}</span>
              </div>
            </div>
            
            <p>A calendar invite is attached. Please ensure you're available and prepared for the session.</p>
            
            <div class="footer">
              <p>Manage your bookings in your advisor dashboard.</p>
              <p>&copy; ${new Date().getFullYear()} Cook a Look. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails
    const [clientEmail, advisorEmail] = await Promise.all([
      sendEmail([booking.client.email], `Booking Confirmed: Style Consultation on ${formattedDate}`, clientEmailHtml, icsContent),
      sendEmail([booking.advisor.email], `New Booking: ${booking.client.full_name} on ${formattedDate}`, advisorEmailHtml, icsContent),
    ]);

    console.log("Emails sent:", { clientEmail, advisorEmail });

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

function generateICS({ title, description, startTime, endTime, isVirtual }: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
}) {
  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cook a Look//Consultation//EN
BEGIN:VEVENT
UID:${Date.now()}@cookalook.com
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${isVirtual ? "Virtual - Video link will be provided" : "In-Person"}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}
