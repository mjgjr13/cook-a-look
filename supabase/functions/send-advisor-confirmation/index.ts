import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface AdvisorConfirmationRequest {
  email: string;
  firstName: string;
  specialty: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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

    const emailResponse = await resend.emails.send({
      from: "Cook A Look <noreply@cookalookcom.lovable.app>",
      to: [email],
      subject: "Welcome to Cook A Look - Application Received!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Cook A Look</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-family: Georgia, serif; font-size: 28px; color: #1a1a1a; margin-bottom: 8px;">Welcome to Cook A Look</h1>
            <p style="color: #c9a96e; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Style Advisor Application</p>
          </div>
          
          <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-family: Georgia, serif; font-size: 20px; color: #1a1a1a; margin-top: 0;">Hi ${safeFirstName}!</h2>
            <p>Thank you for applying to become a Style Advisor on Cook A Look. We're excited to review your application!</p>
            
            <div style="background: white; border-left: 4px solid #c9a96e; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600;">Application Details:</p>
              <p style="margin: 8px 0 0 0;">Specialty: ${safeSpecialty || "Not specified"}</p>
            </div>
            
            <h3 style="font-family: Georgia, serif; font-size: 16px; color: #1a1a1a;">What happens next?</h3>
            <ol style="padding-left: 20px;">
              <li style="margin-bottom: 8px;">Our team will review your application within 2-5 business days</li>
              <li style="margin-bottom: 8px;">We may reach out if we need additional information</li>
              <li style="margin-bottom: 8px;">You'll receive an email once your application is approved</li>
              <li style="margin-bottom: 8px;">After approval, you can start setting up your availability and receiving bookings!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://cookalookcom.lovable.app/advisor" style="display: inline-block; background: #c9a96e; color: white; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 600;">Visit Your Dashboard</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">In the meantime, you can start completing your profile and setting up your availability. This will help you get bookings faster once approved!</p>
          
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Questions? Reply to this email or contact us at support@cookalook.com<br>
            © ${new Date().getFullYear()} Cook A Look. All rights reserved.
          </p>
        </body>
        </html>
      `,
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
