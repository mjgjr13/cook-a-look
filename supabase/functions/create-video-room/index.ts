import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const GOOGLE_MEET_FALLBACK_URL = "https://meet.google.com/new";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const user = userData.user;

    const { bookingId } = await req.json();
    if (!bookingId) return jsonResponse({ error: "Booking ID is required" }, 400);

    // Get booking + verify participant
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`*, client:profiles!bookings_client_id_fkey(id, user_id, full_name), advisor:profiles!bookings_advisor_id_fkey(id, user_id, full_name)`)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) return jsonResponse({ error: "Booking not found" }, 404);

    const isClient = booking.client?.user_id === user.id;
    const isAdvisor = booking.advisor?.user_id === user.id;
    if (!isClient && !isAdvisor) return jsonResponse({ error: "Not authorized for this booking" }, 403);

    // Reuse existing session if present
    const { data: existingSession } = await supabaseClient
      .from("video_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingSession) {
      return jsonResponse({
        roomUrl: existingSession.room_url,
        roomName: existingSession.room_name,
        provider: existingSession.provider ?? "daily",
        fallback: (existingSession.provider ?? "daily") !== "daily",
      });
    }

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    const persistSession = async (provider: string, roomUrl: string, roomName: string) => {
      await supabaseClient.from("video_sessions").insert({
        booking_id: bookingId,
        room_name: roomName,
        room_url: roomUrl,
        provider,
      });
    };

    const useGoogleMeetFallback = async (reason: string) => {
      console.warn("Falling back to Google Meet:", reason);
      const roomName = `gmeet-${bookingId.slice(0, 8)}`;
      await persistSession("google_meet", GOOGLE_MEET_FALLBACK_URL, roomName).catch((e) =>
        console.error("Persist fallback session failed:", e)
      );
      return jsonResponse({
        roomUrl: GOOGLE_MEET_FALLBACK_URL,
        roomName,
        provider: "google_meet",
        fallback: true,
      });
    };

    if (!dailyApiKey) {
      return await useGoogleMeetFallback("DAILY_API_KEY not configured");
    }

    try {
      const roomName = `cal-session-${bookingId.slice(0, 8)}-${Date.now()}`;
      const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dailyApiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            max_participants: 2,
            exp: Math.floor(Date.now() / 1000) + 60 * 120,
          },
        }),
      });

      if (!dailyResponse.ok) {
        const errText = await dailyResponse.text();
        return await useGoogleMeetFallback(`Daily.co ${dailyResponse.status}: ${errText}`);
      }

      const roomData = await dailyResponse.json();
      await persistSession("daily", roomData.url, roomData.name).catch((e) =>
        console.error("Persist daily session failed:", e)
      );

      return jsonResponse({
        roomUrl: roomData.url,
        roomName: roomData.name,
        provider: "daily",
        fallback: false,
      });
    } catch (e) {
      return await useGoogleMeetFallback(`Daily.co threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Create video room error:", error);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
