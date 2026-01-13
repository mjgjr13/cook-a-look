import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { bookingId } = await req.json();
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    
    if (!dailyApiKey) {
      throw new Error("Daily.co API key not configured");
    }

    // Verify the booking exists and user is authorized
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user) throw new Error("Not authenticated");

    // Get the booking
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(id, user_id, full_name),
        advisor:profiles!bookings_advisor_id_fkey(id, user_id, full_name)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Verify user is participant
    const isClient = booking.client?.user_id === user.id;
    const isAdvisor = booking.advisor?.user_id === user.id;
    
    if (!isClient && !isAdvisor) {
      throw new Error("Not authorized for this booking");
    }

    // Check if room already exists
    const { data: existingSession } = await supabaseClient
      .from("video_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({
        roomUrl: existingSession.room_url,
        roomName: existingSession.room_name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new Daily.co room
    const roomName = `cal-session-${bookingId.slice(0, 8)}-${Date.now()}`;
    
    const dailyResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          max_participants: 2,
          exp: Math.floor(Date.now() / 1000) + (60 * 120), // 2 hour expiry
        },
      }),
    });

    if (!dailyResponse.ok) {
      const error = await dailyResponse.text();
      throw new Error(`Daily.co API error: ${error}`);
    }

    const roomData = await dailyResponse.json();

    // Store the session
    await supabaseClient.from("video_sessions").insert({
      booking_id: bookingId,
      room_name: roomData.name,
      room_url: roomData.url,
    });

    return new Response(JSON.stringify({
      roomUrl: roomData.url,
      roomName: roomData.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Create video room error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
