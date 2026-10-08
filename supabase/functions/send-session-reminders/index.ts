import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getOrCreateVideoRoomForBooking } from "../_shared/daily.ts";
import {
  SITE_URL, advisorTimeZone, button, clientTimeZone, detailRows, escapeHtml, formatDate,
  formatTime, formatWeekday, heading, link, paragraph, renderEmail, sendEmail,
} from "../_shared/emailLayout.ts";

// Scheduled function: sends 24h-before AND 1h-before reminders.
// Invoke with `?window=24h` or `?window=1h` (defaults to 1h for backward compat).
// Idempotency: uses bookings.reminder_24h_sent_at / reminder_1h_sent_at columns.

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
      id, client_timezone, ${sentCol},
      slot:availability_slots!inner(start_time, is_virtual),
      client:profiles!bookings_client_id_fkey(email, full_name, timezone),
      advisor:profiles!bookings_advisor_id_fkey(user_id, email, full_name, timezone)
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
        // Rooms are private (token-based): make sure the room exists, but send
        // people to their dashboard, where Join Call issues their personal pass.
        await getOrCreateVideoRoomForBooking(supabase, b.id);
        videoUrl = `${SITE_URL}/signin`;
      } catch (e) { console.error("video room error", e); }
    }

    const clientTz = clientTimeZone(b, client);
    const advisorTz = await advisorTimeZone(supabase, advisor);
    const start = slot.start_time;
    // "on Thursday" for the 24h reminder, "today" for the 1h one.
    const day = (tz: string) => win === "24h" ? `on ${formatWeekday(start, tz)}` : "today";
    const lead = win === "24h" ? "tomorrow" : "in about an hour";
    const joinBlock = videoUrl
      ? button("Open your dashboard", videoUrl) +
        paragraph("Sign in and press Join Call. The room opens 15 minutes before your session.", { muted: true, center: true, small: true })
      : "";
    const details = (otherLabel: string, otherName: string, tz: string) => detailRows([
      [otherLabel, escapeHtml(otherName)],
      ["Date", escapeHtml(formatDate(start, tz))],
      ["Time", escapeHtml(formatTime(start, tz))],
      ["Type", slot.is_virtual ? "Virtual session" : "In person"],
    ]);

    const subjectClient = win === "24h"
      ? "Your Cook A Look consultation is tomorrow"
      : "Your Cook A Look consultation starts soon";
    const subjectAdvisor = win === "24h"
      ? "Upcoming Cook A Look consultation tomorrow"
      : "Upcoming Cook A Look consultation";

    const advisorName = advisor.full_name ?? "your advisor";
    const clientName = client.full_name ?? "a client";

    await sendEmail({
      to: client.email,
      subject: subjectClient,
      html: renderEmail({
        title: `Your session is ${lead}`,
        preheader: `With ${advisorName} ${day(clientTz)} at ${formatTime(start, clientTz)}`,
        body: [
          heading(`Your session is ${lead}`),
          paragraph(`Hi ${escapeHtml(client.full_name ?? "there")},`),
          paragraph(`Your style consultation with <strong>${escapeHtml(advisorName)}</strong> is ${day(clientTz)} at ${escapeHtml(formatTime(start, clientTz))}.`),
          details("Advisor", advisorName, clientTz),
          joinBlock,
          paragraph(`You can also ${link("open your dashboard", `${SITE_URL}/dashboard`)} to join from there.`),
        ].join(""),
      }),
    });
    await sendEmail({
      to: advisor.email,
      subject: subjectAdvisor,
      html: renderEmail({
        title: `You have a session ${lead}`,
        preheader: `With ${clientName} ${day(advisorTz)} at ${formatTime(start, advisorTz)}`,
        body: [
          heading(`You have a session ${lead}`),
          paragraph(`Hi ${escapeHtml(advisor.full_name ?? "there")},`),
          paragraph(`You have a session with <strong>${escapeHtml(clientName)}</strong> ${day(advisorTz)} at ${escapeHtml(formatTime(start, advisorTz))}.`),
          details("Client", clientName, advisorTz),
          joinBlock,
          paragraph(`You can also ${link("open your advisor dashboard", `${SITE_URL}/advisor`)} to join.`),
        ].join(""),
      }),
    });

    await supabase.from("bookings").update({ [sentCol]: new Date().toISOString() }).eq("id", b.id);
    sent += 2;
  }

  return new Response(JSON.stringify({ window: win, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
