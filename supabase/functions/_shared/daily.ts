// Daily.co is the sole video provider for Cook A Look.
// If Daily fails to create or fetch a room, we throw — there is no fallback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface VideoRoom {
  roomUrl: string;
  roomName: string;
  provider: "daily";
}

export async function getOrCreateVideoRoomForBooking(
  supabaseAdmin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<VideoRoom> {
  // 1. Return existing Daily session if present
  const { data: existing } = await supabaseAdmin
    .from("video_sessions")
    .select("room_url, room_name, provider")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing?.room_url && (existing.provider as string) === "daily") {
    return {
      roomUrl: existing.room_url as string,
      roomName: (existing.room_name as string) ?? `cookalook-${bookingId}`,
      provider: "daily",
    };
  }

  // 2. Determine room expiry from booking end time
  let expSeconds = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // default 4h
  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("slot:availability_slots(end_time)")
      .eq("id", bookingId)
      .maybeSingle();
    const endTime = (booking?.slot as { end_time?: string } | null)?.end_time;
    if (endTime) {
      expSeconds = Math.floor(new Date(endTime).getTime() / 1000) + 30 * 60;
    }
  } catch (_e) {
    // ignore; default expiry already set
  }

  const roomName = `cookalook-${bookingId}`.slice(0, 60);
  const dailyKey = Deno.env.get("DAILY_API_KEY");

  if (!dailyKey) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  // 3. Create the Daily room
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

  let roomUrl: string | null = null;

  if (res.ok) {
    const room = await res.json();
    roomUrl = room.url as string;
  } else if (res.status === 400 || res.status === 409) {
    // Room likely already exists on Daily — fetch it.
    const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${dailyKey}` },
    });
    if (!getRes.ok) {
      const errBody = await getRes.text();
      console.error("Daily.co fetch existing room failed", getRes.status, errBody);
      throw new Error(`Daily.co room fetch failed: ${getRes.status}`);
    }
    const room = await getRes.json();
    roomUrl = room.url as string;
  } else {
    const errBody = await res.text();
    console.error("Daily.co create failed", res.status, errBody);
    throw new Error(`Daily.co room creation failed: ${res.status}`);
  }

  // 4. Persist (upsert in case a prior non-daily row exists)
  await supabaseAdmin
    .from("video_sessions")
    .upsert(
      {
        booking_id: bookingId,
        room_name: roomName,
        room_url: roomUrl,
        provider: "daily",
      },
      { onConflict: "booking_id" },
    );

  return { roomUrl: roomUrl!, roomName, provider: "daily" };
}
