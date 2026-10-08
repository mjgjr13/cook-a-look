import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SITE_URL, button, escapeHtml, heading, paragraph, renderEmail, sendEmail } from "../_shared/emailLayout.ts";

// Scheduled function: ~1h after a session ends, email the client a review request.
// Idempotency: bookings.review_request_sent_at.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || !provided || provided !== cronSecret) {
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

    const reviewUrl = `${SITE_URL}/dashboard?review=${b.id}`;
    const html = renderEmail({
      title: "How was your session?",
      preheader: "Share a quick review of your consultation.",
      body: [
        heading("How was your session?"),
        paragraph(`Hi ${escapeHtml(client.full_name ?? "there")},`),
        paragraph(`We hope your consultation with <strong>${escapeHtml(advisor?.full_name ?? "your advisor")}</strong> was helpful. Would you take a moment to share a quick review? It helps other clients find the right advisor.`),
        button("Leave a review", reviewUrl),
      ].join(""),
    });

    await sendEmail({ to: client.email, subject: "How was your Cook A Look session?", html });
    await supabase.from("bookings").update({ review_request_sent_at: new Date().toISOString() }).eq("id", b.id);
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
