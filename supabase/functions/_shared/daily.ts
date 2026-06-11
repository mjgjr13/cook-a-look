// Shared helper to create or fetch a Daily.co room for a booking.
// Falls back to a deterministic Jitsi room URL on meet.ffmuc.net if Daily fails.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface VideoRoom {
  roomUrl: string;
  roomName: string;
  provider: "daily" | "jitsi_fallback";
}

export async function getOrCreateVideoRoomForBooking(
  supabaseAdmin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<VideoRoom> {
  // 1. Return existing session if present
  const { data: existing } = await supabaseAdmin
    .from("video_sessions")
    .select("room_url, room_name, provider")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing?.room_url) {
    return {
      roomUrl: existing.room_url as string,
      roomName: (existing.room_name as string) ?? `cookalook-${bookingId}`,
      provider:
        ((existing.provider as string) === "daily" ? "daily" : "jitsi_fallback") as
          | "daily"
          | "jitsi_fallback",
    };
  }

  // 2. Fetch booking end time for Daily room expiry
  let expSeconds = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // default 4h from now
  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("slot:availability_slots(end_time)")
      .eq("id", bookingId)
      .maybeSingle();
    const endTime = (booking?.slot as { end_time?: string } | null)?.end_time;
    if (endTime) {
      expSeconds = Math.floor(new Date(endTime).getTime() / 1000) + 30 * 60; // +30 min buffer
    }
  } catch (_e) {
    // ignore; default expiry already set
  }

  const roomName = `cookalook-${bookingId}`.slice(0, 60);
  const dailyKey = Deno.env.get("DAILY_API_KEY");

  // 3. Try Daily.co
  if (dailyKey) {
    try {
      const res = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dailyKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "public",
          properties: {
            exp: expSeconds,
            enable_prejoin_ui: false,
            enable_screenshare: true,
            enable_chat: true,
            start_video_off: false,
            start_audio_off: false,
            enable_recording: "cloud",
          },
        }),
      });

      if (res.ok) {
        const room = await res.json();
        const roomUrl = room.url as string;
        await supabaseAdmin.from("video_sessions").insert({
          booking_id: bookingId,
          room_name: roomName,
          room_url: roomUrl,
          provider: "daily",
        });
        return { roomUrl, roomName, provider: "daily" };
      }

      // Daily returned 4xx/5xx (room may already exist on Daily side — try to fetch it)
      if (res.status === 400 || res.status === 409) {
        const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: { Authorization: `Bearer ${dailyKey}` },
        });
        if (getRes.ok) {
          const room = await getRes.json();
          const roomUrl = room.url as string;
          await supabaseAdmin.from("video_sessions").insert({
            booking_id: bookingId,
            room_name: roomName,
            room_url: roomUrl,
            provider: "daily",
          });
          return { roomUrl, roomName, provider: "daily" };
        }
      }

      const errBody = await res.text();
      console.error("Daily.co create failed", res.status, errBody);
    } catch (e) {
      console.error("Daily.co request error:", e);
    }
  } else {
    console.warn("DAILY_API_KEY missing — using Jitsi fallback");
  }

  // 4. Fallback: Jitsi on meet.ffmuc.net (no moderator login required)
  const fallbackUrl = `https://meet.ffmuc.net/${roomName}#config.prejoinPageEnabled=false`;
  await supabaseAdmin.from("video_sessions").insert({
    booking_id: bookingId,
    room_name: roomName,
    room_url: fallbackUrl,
    provider: "jitsi_fallback",
  });
  return { roomUrl: fallbackUrl, roomName, provider: "jitsi_fallback" };
}
