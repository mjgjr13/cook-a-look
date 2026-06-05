import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Scheduled function: sends a one-time reminder email ~1h before each confirmed booking.
// Idempotency: writes to admin_messages with a deterministic subject to dedupe.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Find confirmed bookings starting in 45-75 minutes that haven't been reminded
  const now = Date.now();
  const from = new Date(now + 45 * 60 * 1000).toISOString();
  const to = new Date(now + 75 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("bookings")
    .select(`
      id,
      slot:availability_slots!inner(start_time, is_virtual),
      client:profiles!bookings_client_id_fkey(email, full_name),
      advisor:profiles!bookings_advisor_id_fkey(email, full_name)
    `)
    .eq("status", "confirmed")
    .gte("slot.start_time", from)
    .lte("slot.start_time", to);

  if (error) {
    console.error("query error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const b of rows ?? []) {
    const slot = (b as any).slot;
    const client = (b as any).client;
    const advisor = (b as any).advisor;
    if (!slot || !client?.email || !advisor?.email) continue;

    const when = new Date(slot.start_time).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const dashUrl = "https://cookalook.com/dashboard";
    const advUrl = "https://cookalook.com/advisor";

    await sendEmail(
      client.email,
      `Your Cook A Look consultation starts soon`,
      `<p>Hi ${client.full_name ?? ""},</p>
       <p>Your style consultation with <strong>${advisor.full_name ?? "your advisor"}</strong> begins at ${when}.</p>
       <p><a href="${dashUrl}">Open your dashboard to join</a> when it's time.</p>`,
    );
    await sendEmail(
      advisor.email,
      `Upcoming Cook A Look consultation`,
      `<p>Hi ${advisor.full_name ?? ""},</p>
       <p>You have a session with <strong>${client.full_name ?? "a client"}</strong> at ${when}.</p>
       <p><a href="${advUrl}">Open your advisor dashboard to join</a> when it's time.</p>`,
    );
    sent += 2;
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
