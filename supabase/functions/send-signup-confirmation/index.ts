import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { SITE_URL, button, escapeHtml, heading, list, paragraph, renderEmail, sendEmail } from "../_shared/emailLayout.ts";

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

    // listUsers() has no email filter, so look the account up via profiles
    // (created by the signup trigger) and confirm the auth email matches exactly.
    const normalizedEmail = email.trim().toLowerCase();
    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    const { data: userResult } = profileRow?.user_id
      ? await supabaseAdmin.auth.admin.getUserById(profileRow.user_id)
      : { data: { user: null } };
    const user = userResult?.user;

    if (!user || user.email?.toLowerCase() !== normalizedEmail) {
      // Same generic response either way, so this can't be used to probe which emails have accounts.
      return new Response(
        JSON.stringify({ error: "Unable to send" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
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

    const safeFirstName = escapeHtml(firstName);
    const html = isAdvisor
      ? renderEmail({
          title: subject,
          preheader: "We've received your Style Advisor application.",
          body: [
            heading(`Thank you for applying, ${safeFirstName}`),
            paragraph("We've received your application to become a Style Advisor on Cook A Look."),
            paragraph("<strong>What happens next?</strong>"),
            list([
              "Our team will review your application and portfolio",
              "We'll verify your credentials and social presence",
              "You'll receive a decision within 2–5 business days",
            ]),
            paragraph("If approved, you'll receive onboarding instructions to set up your availability and start accepting bookings."),
          ].join(""),
        })
      : renderEmail({
          title: subject,
          preheader: "Your account is ready. Meet our style advisors.",
          body: [
            heading(`Welcome to Cook A Look, ${safeFirstName}`),
            paragraph("Your account has been created. You're ready to discover your personal style with the help of our expert advisors."),
            paragraph("<strong>Here's what you can do:</strong>"),
            list([
              "Browse our curated selection of style advisors",
              "Book virtual or in-person consultations",
              "Explore our lookbook for style inspiration",
              "Earn rewards with every booking",
            ]),
            button("Browse advisors", `${SITE_URL}/advisors`),
          ].join(""),
        });

    const emailResponse = await sendEmail({ to: user.email as string, subject, html, throwOnError: true });

    console.log("Email sent successfully to", email, "for user", user.id);

    return new Response(JSON.stringify({ success: true, ...(emailResponse ?? {}) }), {
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
