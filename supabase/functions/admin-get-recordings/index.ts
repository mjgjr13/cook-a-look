// Admin-only edge function. Returns signed Daily.co recording links for a given booking.
// Used by admins to retrieve session recordings for dispute resolution.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface DailyRecording {
  id: string;
  room_name: string;
  start_ts: number;
  duration: number;
  status: string;
  share_token?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dailyKey = Deno.env.get("DAILY_API_KEY");

    // Validate the caller's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify admin role
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId } = await req.json().catch(() => ({}));
    if (!bookingId || typeof bookingId !== "string") {
      return new Response(JSON.stringify({ error: "bookingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessErr } = await admin
      .from("video_sessions")
      .select("room_name, provider")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (sessErr) throw sessErr;
    if (!session) {
      return new Response(
        JSON.stringify({ recordings: [], note: "No video session for this booking." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (session.provider !== "daily") {
      return new Response(
        JSON.stringify({
          recordings: [],
          note: "This session was not recorded on Daily.co. No recording is available.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!dailyKey) {
      return new Response(
        JSON.stringify({ error: "DAILY_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // List recordings for this room
    const listRes = await fetch(
      `https://api.daily.co/v1/recordings?room_name=${encodeURIComponent(session.room_name as string)}&limit=50`,
      { headers: { Authorization: `Bearer ${dailyKey}` } },
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      console.error("Daily list recordings failed", listRes.status, body);
      return new Response(JSON.stringify({ error: "Failed to list recordings" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const listJson = await listRes.json();
    const recordings: DailyRecording[] = listJson?.data ?? [];

    // Request a short-lived access link for each recording
    const withLinks = await Promise.all(
      recordings.map(async (rec) => {
        try {
          const linkRes = await fetch(
            `https://api.daily.co/v1/recordings/${rec.id}/access-link`,
            { headers: { Authorization: `Bearer ${dailyKey}` } },
          );
          if (!linkRes.ok) return { ...rec, download_link: null, expires: null };
          const linkJson = await linkRes.json();
          return {
            id: rec.id,
            start_ts: rec.start_ts,
            duration: rec.duration,
            status: rec.status,
            download_link: linkJson?.download_link ?? null,
            expires: linkJson?.expires ?? null,
          };
        } catch (e) {
          console.error("Access link error", e);
          return { ...rec, download_link: null, expires: null };
        }
      }),
    );

    return new Response(JSON.stringify({ recordings: withLinks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-get-recordings error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
