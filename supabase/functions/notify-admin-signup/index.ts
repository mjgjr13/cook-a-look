import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SITE_URL, button, detailRows, escapeHtml, heading, paragraph, renderEmail, sendEmail } from "../_shared/emailLayout.ts";

// Emails the admin (ADMIN_EMAIL) when someone CONFIRMS a new account.
// Called by a database trigger on auth.users (migration 20261017140000) the
// moment email_confirmed_at is first set, so bot sign-ups that never confirm
// don't send anything. Gated by the shared CRON_SECRET header (verify_jwt = false).
// Advisor applications are announced separately by submit-advisor-application.

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!adminEmail) return new Response(JSON.stringify({ skipped: "no ADMIN_EMAIL" }), { status: 200 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").slice(0, 320);
  const fullName = String(body?.full_name ?? "").trim().slice(0, 200) || "(no name given)";
  const provider = String(body?.provider ?? "email").slice(0, 40);
  const createdAt = String(body?.created_at ?? "");
  if (!email) return new Response(JSON.stringify({ error: "missing email" }), { status: 400 });

  const signedUp = createdAt && !isNaN(new Date(createdAt).getTime())
    ? new Date(createdAt).toLocaleString("en-US", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" })
    : "just now";

  const html = renderEmail({
    title: "New Cook A Look account",
    preheader: `${fullName} just joined Cook A Look.`,
    body: [
      heading("New account confirmed"),
      paragraph(`<strong>${escapeHtml(fullName)}</strong> just created and confirmed a Cook A Look account.`),
      detailRows([
        ["Name", escapeHtml(fullName)],
        ["Email", escapeHtml(email)],
        ["Signed up with", provider === "google" ? "Google" : "Email and password"],
        ["Signed up", escapeHtml(signedUp)],
      ]),
      paragraph("If they apply to become an advisor, you'll get a separate email to review the application.", { muted: true, small: true }),
      button("Open admin", `${SITE_URL}/admin`),
    ].join(""),
  });

  await sendEmail({ to: adminEmail, subject: `New account: ${fullName}`, html });
  return new Response(JSON.stringify({ sent: true }), { headers: { "Content-Type": "application/json" } });
});
