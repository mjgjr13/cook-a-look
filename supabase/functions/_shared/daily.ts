// Daily.co is the primary video provider for Cook A Look.
// If Daily fails to create or fetch a room (network, quota, bad/missing key),
// we fall back to a deterministic Jitsi room on meet.ffmuc.net so the call
// never breaks for the user. See .lovable/memory/technical/video-provider.md.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isTestBookableAdvisor } from "./testMode.ts";

export interface VideoRoom {
  roomUrl: string;
  roomName: string;
  provider: "daily" | "jitsi_fallback";
}

function jitsiRoomFor(roomName: string): VideoRoom {
  return {
    roomUrl: `https://meet.ffmuc.net/${roomName}#config.prejoinPageEnabled=false`,
    roomName,
    provider: "jitsi_fallback",
  };
}

export async function getOrCreateVideoRoomForBooking(
  supabaseAdmin: ReturnType<typeof createClient>,
  bookingId: string,
): Promise<VideoRoom> {
  // 1. Return the existing session if present — never hand the two
  // participants different rooms once one has been issued.
  const { data: existing } = await supabaseAdmin
    .from("video_sessions")
    .select("room_url, room_name, provider")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existing?.room_url) {
    const provider = (existing.provider as string) === "daily" ? "daily" : "jitsi_fallback";
    return {
      roomUrl: existing.room_url as string,
      roomName: (existing.room_name as string) ?? `cookalook-${bookingId}`,
      provider,
    };
  }

  // 2. Determine the room's valid time window from the booked slot.
  const nowSeconds = Math.floor(Date.now() / 1000);
  let expSeconds = nowSeconds + 4 * 60 * 60; // default 4h
  let nbfSeconds: number | null = null;
  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("advisor_id, slot:availability_slots(start_time, end_time)")
      .eq("id", bookingId)
      .maybeSingle();
    const slot = booking?.slot as { start_time?: string; end_time?: string } | null;
    if (slot?.end_time) {
      expSeconds = Math.floor(new Date(slot.end_time).getTime() / 1000) + 30 * 60;
    }
    // Test bookings with the designated test advisor (Stripe test mode only) open
    // immediately so the video flow can be tested without waiting for the slot.
    const testBooking = isTestBookableAdvisor((booking as { advisor_id?: string } | null)?.advisor_id);
    if (slot?.start_time && !testBooking) {
      // Allow joining up to 15 minutes early, but not days in advance.
      const candidate = Math.floor(new Date(slot.start_time).getTime() / 1000) - 15 * 60;
      if (candidate > nowSeconds && candidate < expSeconds) {
        nbfSeconds = candidate;
      }
    }
  } catch (_e) {
    // ignore; default expiry already set
  }

  const roomName = `cookalook-${bookingId}`.slice(0, 60);

  // 3. Create the Daily room; on any failure fall back to Jitsi.
  let room: VideoRoom;
  try {
    const dailyKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyKey) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        // Private: joining needs a meeting token from create-video-room (issued only
        // to the booking's client and advisor), so a leaked room URL isn't enough.
        privacy: "private",
        properties: {
          exp: expSeconds,
          ...(nbfSeconds ? { nbf: nbfSeconds } : {}),
          enable_prejoin_ui: false,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: "cloud",
        },
      }),
    });

    let roomUrl: string;
    if (res.ok) {
      const created = await res.json();
      roomUrl = created.url as string;
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
      const fetched = await getRes.json();
      roomUrl = fetched.url as string;
    } else {
      const errBody = await res.text();
      console.error("Daily.co create failed", res.status, errBody);
      throw new Error(`Daily.co room creation failed: ${res.status}`);
    }

    room = { roomUrl, roomName, provider: "daily" };
  } catch (e) {
    console.error("Daily.co unavailable, falling back to Jitsi:", e);
    room = jitsiRoomFor(roomName);
  }

  // 4. Persist. room_name is deterministic per booking and UNIQUE, so a
  // concurrent create by the other participant converges on the same row.
  const { error: upsertError } = await supabaseAdmin
    .from("video_sessions")
    .upsert(
      {
        booking_id: bookingId,
        room_name: room.roomName,
        room_url: room.roomUrl,
        provider: room.provider,
      },
      { onConflict: "room_name" },
    );
  if (upsertError) {
    // Non-fatal: the room exists on the provider and the name is
    // deterministic, so both parties still land in the same room.
    console.error("Failed to persist video session:", upsertError);
  }

  return room;
}

/**
 * Short-lived Daily meeting token for one participant of a booking's room.
 * Required for private rooms. Returns null if Daily isn't configured or the
 * request fails (the caller then falls back to the plain room URL).
 */
export async function createMeetingToken(roomName: string, userName: string, expSeconds: number): Promise<string | null> {
  const dailyKey = Deno.env.get("DAILY_API_KEY");
  if (!dailyKey) return null;
  try {
    const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: { Authorization: `Bearer ${dailyKey}`, "Content-Type": "application/json" },
      // start_cloud_recording: every session is recorded automatically as soon
      // as someone joins (participants consent on the pre-call screen). Daily
      // ignores it if a recording is already running.
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName.slice(0, 60),
          exp: expSeconds,
          is_owner: false,
          enable_recording: "cloud",
          start_cloud_recording: true,
        },
      }),
    });
    if (!res.ok) {
      console.error("Daily meeting token failed", res.status, await res.text());
      return null;
    }
    const { token } = await res.json();
    return typeof token === "string" ? token : null;
  } catch (e) {
    console.error("Daily meeting token error", e);
    return null;
  }
}
