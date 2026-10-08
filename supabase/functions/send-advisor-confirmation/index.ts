import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { SITE_URL, button, detailRows, escapeHtml, heading, list, paragraph, renderEmail, sendEmail } from "../_shared/emailLayout.ts";

interface AdvisorConfirmationRequest {
  email: string;
  firstName: string;
  specialty: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    // Require authenticated caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, firstName, specialty }: AdvisorConfirmationRequest = await req.json();

    // Validate required fields
    if (!email || !firstName) {
      throw new Error("Missing required fields");
    }

    // Only allow sending to the authenticated caller's own email address
    if ((userData.user.email ?? "").toLowerCase() !== String(email).toLowerCase()) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeFirstName = escapeHtml(firstName);
    const safeSpecialty = escapeHtml(specialty || "");

    const html = renderEmail({
      title: "Welcome to Cook A Look",
      preheader: "We've received your Style Advisor application.",
      body: [
        heading(`Welcome, ${safeFirstName}`),
        paragraph("Thank you for applying to become a Style Advisor on Cook A Look. We're excited to review your application."),
        detailRows([["Specialty", safeSpecialty || "Not specified"]]),
        paragraph("<strong>What happens next?</strong>"),
        list([
          "Our team will review your application within 2–5 business days",
          "We may reach out if we need additional information",
          "You'll receive an email once your application is approved",
          "After approval, you can set up your availability and start receiving bookings",
        ]),
        button("Visit your dashboard", `${SITE_URL}/advisor`),
        paragraph("In the meantime, you can complete your profile and set up your availability. This will help you get bookings faster once approved.", { muted: true }),
      ].join(""),
    });

    const emailResponse = await sendEmail({
      to: email,
      subject: "Welcome to Cook A Look - Application Received!",
      html,
      throwOnError: true,
    });

    console.log("Advisor confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-advisor-confirmation function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
