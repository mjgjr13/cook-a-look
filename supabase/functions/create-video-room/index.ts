import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getOrCreateVideoRoomForBooking } from "../_shared/daily.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authorization required" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const { bookingId } = await req.json();
    if (!bookingId) return jsonResponse({ error: "Booking ID is required" }, 400);

    // Authorize: only client or advisor of the booking can fetch the room
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`id, meeting_type, client:profiles!bookings_client_id_fkey(user_id), advisor:profiles!bookings_advisor_id_fkey(user_id)`)
      .eq("id", bookingId)
      .single();
    if (bookingError || !booking) return jsonResponse({ error: "Booking not found" }, 404);

    if ((booking as { meeting_type?: string }).meeting_type === "in_person") {
      return jsonResponse({ error: "This is an in-person booking — no video room available." }, 400);
    }

    const clientUserId = (booking.client as { user_id?: string } | null)?.user_id;
    const advisorUserId = (booking.advisor as { user_id?: string } | null)?.user_id;
    if (user.id !== clientUserId && user.id !== advisorUserId) {
      return jsonResponse({ error: "Not authorized for this booking" }, 403);
    }

    const room = await getOrCreateVideoRoomForBooking(supabaseAdmin, bookingId);
    return jsonResponse(room);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Create video room error:", error);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
