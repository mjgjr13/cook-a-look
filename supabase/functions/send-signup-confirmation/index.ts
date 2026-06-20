import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SignupConfirmationRequest {
  email: string;
  name: string;
  type: "user" | "advisor";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  try {
    const { email, name, type }: SignupConfirmationRequest = await req.json();

    // Validate input
    if (!email || typeof email !== "string" || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!name || typeof name !== "string" || name.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["user", "advisor"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the email actually belongs to a real auth user (prevents email bombing).
    // We cannot rely on a user session here because signup with email confirmation
    // does not return a session.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userLookup, error: lookupError } = await supabaseAdmin
      .auth.admin.listUsers({ page: 1, perPage: 1, email: email.toLowerCase() } as never);

    if (lookupError || !userLookup?.users?.length) {
      console.error("No auth user found for email:", email, lookupError?.message);
      return new Response(
        JSON.stringify({ error: "Unknown recipient" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userLookup.users[0];
    // Only send within 5 minutes of account creation to avoid abuse
    const createdAt = new Date(user.created_at).getTime();
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: "Confirmation window expired" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const firstName = name?.split(" ")[0] || "there";
    const isAdvisor = type === "advisor";

    const subject = isAdvisor
      ? "Welcome to Cook A Look - Advisor Application Received"
      : "Welcome to Cook A Look!";

    const html = isAdvisor
      ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 40px; }
              .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
              .highlight { color: #c9a227; font-weight: 600; }
              .footer { text-align: center; color: #666; font-size: 14px; }
              .steps { margin: 20px 0; }
              .step { margin: 15px 0; padding-left: 25px; position: relative; }
              .step::before { content: "✓"; position: absolute; left: 0; color: #c9a227; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Cook A Look</div>
              </div>
              <h1>Thank you for applying, ${firstName}!</h1>
              <div class="content">
                <p>We've received your application to become a Style Advisor on Cook A Look.</p>
                <p class="highlight">What happens next?</p>
                <div class="steps">
                  <div class="step">Our team will review your application and portfolio</div>
                  <div class="step">We'll verify your credentials and social presence</div>
                  <div class="step">You'll receive a decision within 2-5 business days</div>
                </div>
                <p>If approved, you'll receive onboarding instructions to set up your availability and start accepting bookings.</p>
              </div>
              <div class="footer">
                <p>Questions? Reply to this email and we'll help you out.</p>
                <p>&copy; ${new Date().getFullYear()} Cook A Look. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 40px; }
              .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
              .highlight { color: #c9a227; font-weight: 600; }
              .cta { display: inline-block; background: #1a1a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
              .footer { text-align: center; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Cook A Look</div>
              </div>
              <h1>Welcome to Cook A Look, ${firstName}!</h1>
              <div class="content">
                <p>Your account has been created successfully. You're now ready to discover your personal style with the help of our expert advisors.</p>
                <p class="highlight">Here's what you can do:</p>
                <ul>
                  <li>Browse our curated selection of style advisors</li>
                  <li>Book virtual or in-person consultations</li>
                  <li>Explore our lookbook for style inspiration</li>
                  <li>Earn rewards with every booking</li>
                </ul>
                <p style="text-align: center;">
                  <a href="https://cookalookcom.lovable.app/advisors" class="cta">Browse Advisors</a>
                </p>
              </div>
              <div class="footer">
                <p>Questions? Reply to this email and we'll help you out.</p>
                <p>&copy; ${new Date().getFullYear()} Cook A Look. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    const emailResponse = await resend.emails.send({
      from: "Cook A Look <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully to", email, "for user", user.id);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-signup-confirmation function:", error);
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
