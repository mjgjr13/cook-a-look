## Goal
Restore Daily.co as the primary video provider, with mobile camera flip, server-side session recording for disputes, and a fallback external join link if the embed fails.

## What changes

### 1. `create-video-room` edge function
- Rewrite to call Daily REST API (`POST https://api.daily.co/v1/rooms`) using `DAILY_API_KEY` (already in secrets).
- Create a private room per booking with:
  - `enable_prejoin_ui: false`, `enable_screenshare: true`, `enable_chat: true`
  - `start_video_off: false`, `start_audio_off: false`
  - `enable_recording: "cloud"` (server-side recording, retrieved later for dispute review)
  - `exp` set to booking end + 30 min
- Persist `room_url`, `room_name`, `provider: "daily"` in `video_sessions`. If a row already exists, return it.
- If the Daily API call fails (network, quota, bad key), persist a Jitsi `meet.ffmuc.net/cookalook-{bookingId}` fallback row with `provider: "jitsi_fallback"` and return that — call never breaks.

### 2. `VideoCall.tsx` component
- Embed via `@daily-co/daily-js` `DailyIframe.createFrame` with `showLeaveButton`, `showFullscreenButton`. Daily prebuilt UI already exposes the **flip camera** button on mobile and a screenshare button on desktop.
- Show a persistent "Having trouble? **Open in new tab**" link next to End Call — opens `room_url` directly (works on Daily and the Jitsi fallback).
- For `jitsi_fallback`, render the existing iframe path instead of Daily SDK.
- On End Call (client side): open the existing `ReviewModal`.

### 3. Recording retention (dispute support)
- Recordings live in Daily's cloud storage by default — no extra infra needed for MVP. When a dispute is opened, an admin can fetch the recording URL via the Daily dashboard / REST API. (Already aligned with existing `video-recording-disputes` memory.)
- No new DB column needed now; can add `recording_url` to `video_sessions` later when we automate retrieval.

### 4. Fallback join link in confirmation email
- Update `send-booking-confirmation` to include the room URL (created at booking time) so both parties always have a join link, even if the in-app button has issues.

### 5. Clean up stale sessions
- Migration: clear `video_sessions` rows where `provider != 'daily'` so existing bookings re-create proper Daily rooms on next join.

### 6. Update memory
- `mem://technical/video-provider` set back to Daily.co primary + Jitsi `meet.ffmuc.net` as automatic fallback.

## Technical notes
- Dependency: `npm:@daily-co/daily-js` (loaded via esm.sh in the React component).
- No new secrets required — `DAILY_API_KEY` is already configured.
- Daily free tier: 10,000 participant-minutes/month + 5 GB recording storage. Recording is billed per minute beyond the free tier — fine for MVP scale.
- Mobile camera flip is part of Daily's prebuilt UI out of the box; no extra code.

## Out of scope (for now)
- Automated recording download into your own storage.
- Per-user moderator tokens (would let us auto-admit only the booking parties — can layer on later).
- Calendar (.ics) attachments — separate ask.