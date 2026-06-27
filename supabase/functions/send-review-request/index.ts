import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Scheduled function: ~1h after a session ends, email the client a review request.
// Idempotency: bookings.review_request_sent_at.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Cook A Look <notify@cookalook.com>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!resp.ok) console.error("Resend error:", await resp.text());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = Date.now();
  // Sessions that ended 45-180 minutes ago
  const endedFrom = new Date(now - 180 * 60 * 1000).toISOString();
  const endedTo   = new Date(now -  45 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("bookings")
    .select(`
      id, review_request_sent_at,
      slot:availability_slots!inner(end_time),
      client:profiles!bookings_client_id_fkey(email, full_name),
      advisor:profiles!bookings_advisor_id_fkey(full_name)
    `)
    .in("status", ["completed", "confirmed"])
    .is("review_request_sent_at", null)
    .gte("slot.end_time", endedFrom)
    .lte("slot.end_time", endedTo);

  if (error) {
    console.error("query error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const b of (rows ?? []) as any[]) {
    const client = b.client, advisor = b.advisor;
    if (!client?.email) continue;

    const reviewUrl = `https://cookalook.com/dashboard?review=${b.id}`;
    const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#1a1a1a;background:#FAF8F5;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;">
        <div style="text-align:center;letter-spacing:2px;font-weight:500;font-size:18px;margin-bottom:24px;">COOK A LOOK</div>
        <h1 style="font-weight:400;font-size:22px;text-align:center;">How was your session?</h1>
        <p>Hi ${client.full_name ?? ""},</p>
        <p>We hope your consultation with <strong>${advisor?.full_name ?? "your advisor"}</strong> was helpful. Would you take a moment to share a quick review? It helps other clients find the right advisor.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${reviewUrl}" style="background:#1a1a1a;color:#fff;padding:12px 28px;text-decoration:none;letter-spacing:1px;font-size:14px;">LEAVE A REVIEW</a>
        </p>
        <p style="color:#888;font-size:12px;text-align:center;margin-top:32px;">&copy; ${new Date().getFullYear()} Cook A Look</p>
      </div></body></html>`;

    await sendEmail(client.email, "How was your Cook A Look session?", html);
    await supabase.from("bookings").update({ review_request_sent_at: new Date().toISOString() }).eq("id", b.id);
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
