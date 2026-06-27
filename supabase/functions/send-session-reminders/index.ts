import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getOrCreateVideoRoomForBooking } from "../_shared/daily.ts";

// Scheduled function: sends 24h-before AND 1h-before reminders.
// Invoke with `?window=24h` or `?window=1h` (defaults to 1h for backward compat).
// Idempotency: uses bookings.reminder_24h_sent_at / reminder_1h_sent_at columns.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Cook A Look <notify@cookalook.com>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing, skipping email to", to);
    return;
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!resp.ok) console.error("Resend error:", await resp.text());
}

function brandWrap(title: string, inner: string) {
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#1a1a1a;background:#FAF8F5;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;">
      <div style="text-align:center;letter-spacing:2px;font-weight:500;font-size:18px;margin-bottom:24px;">COOK A LOOK</div>
      <h1 style="font-weight:400;font-size:22px;text-align:center;">${title}</h1>
      ${inner}
      <p style="text-align:center;color:#888;font-size:12px;margin-top:32px;">&copy; ${new Date().getFullYear()} Cook A Look</p>
    </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const url = new URL(req.url);
  const win = url.searchParams.get("window") === "24h" ? "24h" : "1h";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = Date.now();
  // Generous windows so cron jitter doesn't miss bookings
  let fromMs: number, toMs: number, sentCol: string;
  if (win === "24h") {
    fromMs = now + 23 * 60 * 60 * 1000;
    toMs   = now + 25 * 60 * 60 * 1000;
    sentCol = "reminder_24h_sent_at";
  } else {
    fromMs = now + 30 * 60 * 1000;
    toMs   = now + 90 * 60 * 1000;
    sentCol = "reminder_1h_sent_at";
  }

  const { data: rows, error } = await supabase
    .from("bookings")
    .select(`
      id, ${sentCol},
      slot:availability_slots!inner(start_time, is_virtual),
      client:profiles!bookings_client_id_fkey(email, full_name),
      advisor:profiles!bookings_advisor_id_fkey(email, full_name)
    `)
    .eq("status", "confirmed")
    .is(sentCol, null)
    .gte("slot.start_time", new Date(fromMs).toISOString())
    .lte("slot.start_time", new Date(toMs).toISOString());

  if (error) {
    console.error("query error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const b of (rows ?? []) as any[]) {
    const slot = b.slot, client = b.client, advisor = b.advisor;
    if (!slot || !client?.email || !advisor?.email) continue;

    let videoUrl: string | null = null;
    if (slot.is_virtual) {
      try {
        const room = await getOrCreateVideoRoomForBooking(supabase, b.id);
        videoUrl = room.roomUrl;
      } catch (e) { console.error("video room error", e); }
    }

    const when = new Date(slot.start_time).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
    const joinBtn = videoUrl
      ? `<p style="text-align:center;margin:24px 0;"><a href="${videoUrl}" style="background:#1a1a1a;color:#fff;padding:12px 28px;text-decoration:none;letter-spacing:1px;font-size:14px;">JOIN VIDEO CALL</a></p>`
      : "";
    const lead = win === "24h" ? "tomorrow" : "in about an hour";

    const subjectClient = win === "24h"
      ? "Your Cook A Look consultation is tomorrow"
      : "Your Cook A Look consultation starts soon";
    const subjectAdvisor = win === "24h"
      ? "Upcoming Cook A Look consultation tomorrow"
      : "Upcoming Cook A Look consultation";

    await sendEmail(client.email, subjectClient, brandWrap(
      `Your session is ${lead}`,
      `<p>Hi ${client.full_name ?? ""},</p>
       <p>Your style consultation with <strong>${advisor.full_name ?? "your advisor"}</strong> is scheduled for ${when}.</p>
       ${joinBtn}
       <p>You can also <a href="https://cookalook.com/dashboard">open your dashboard</a> to join from there.</p>`,
    ));
    await sendEmail(advisor.email, subjectAdvisor, brandWrap(
      `You have a session ${lead}`,
      `<p>Hi ${advisor.full_name ?? ""},</p>
       <p>You have a session with <strong>${client.full_name ?? "a client"}</strong> at ${when}.</p>
       ${joinBtn}
       <p>You can also <a href="https://cookalook.com/advisor">open your advisor dashboard</a> to join.</p>`,
    ));

    await supabase.from("bookings").update({ [sentCol]: new Date().toISOString() }).eq("id", b.id);
    sent += 2;
  }

  return new Response(JSON.stringify({ window: win, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
