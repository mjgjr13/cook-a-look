// Temporary diagnostic function: sends a single test email via Resend.
// Deleted after verification. Not linked from the app.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "missing env", hasKey: !!RESEND_API_KEY, hasAdmin: !!ADMIN_EMAIL }), { status: 500 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to") || ADMIN_EMAIL;
  const from = url.searchParams.get("from") || "Cook A Look <notify@cookalook.com>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from,
      to,
      subject: "Cook A Look — email delivery test",
      html: `<p>This is a test email from Cook A Look to verify Resend delivery.</p><p>Sent: ${new Date().toISOString()}</p>`,
    }),
  });

  const bodyText = await resp.text();
  let bodyJson: unknown = null;
  try { bodyJson = JSON.parse(bodyText); } catch { /* not json */ }

  return new Response(JSON.stringify({
    ok: resp.ok,
    status: resp.status,
    from,
    to,
    resend: bodyJson ?? bodyText,
  }, null, 2), {
    status: resp.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  });
});
