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
    // Properly check Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    console.log("Authenticated user:", user.id);

    const { bookingId } = await req.json();
    
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Booking ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    
    if (!dailyApiKey) {
      console.error("Daily.co API key not configured");
      return new Response(JSON.stringify({ error: "Video service not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

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
      console.error("Booking not found:", bookingError?.message);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Verify user is participant
    const isClient = booking.client?.user_id === user.id;
    const isAdvisor = booking.advisor?.user_id === user.id;
    
    if (!isClient && !isAdvisor) {
      console.error("User not authorized for booking:", user.id);
      return new Response(JSON.stringify({ error: "Not authorized for this booking" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    console.log("User authorized as:", isClient ? "client" : "advisor");

    // Check if room already exists
    const { data: existingSession } = await supabaseClient
      .from("video_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (existingSession) {
      console.log("Returning existing video room:", existingSession.room_name);
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
    console.log("Creating new video room:", roomName);
    
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
      console.error("Daily.co API error:", error);
      return new Response(JSON.stringify({ error: "Failed to create video room" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const roomData = await dailyResponse.json();
    console.log("Video room created:", roomData.name);

    // Store the session
    const { error: insertError } = await supabaseClient.from("video_sessions").insert({
      booking_id: bookingId,
      room_name: roomData.name,
      room_url: roomData.url,
    });

    if (insertError) {
      console.error("Error storing video session:", insertError.message);
      // Still return the room URL even if storage fails
    }

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