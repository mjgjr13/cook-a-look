---
name: Video Provider
description: Daily.co primary embedded video with mobile camera flip and cloud recording; Jitsi (meet.ffmuc.net) automatic fallback
type: technical
---

# Video Provider — Daily.co

Primary: **Daily.co** via `@daily-co/daily-js` prebuilt UI, embedded in `VideoCall.tsx`.

## Why Daily
- Mobile camera flip is supported out-of-the-box by the Daily prebuilt UI.
- Cloud recording (`enable_recording: "cloud"`) is enabled on every room — recordings live in Daily's storage and are retrievable by admins for dispute resolution.
- No external accounts, OAuth, or invite emails — both parties land in the same room by clicking "Join" in their dashboard.
- `DAILY_API_KEY` already configured in Supabase secrets.

## Room creation
`supabase/functions/_shared/daily.ts` exposes `getOrCreateVideoRoomForBooking(supabaseAdmin, bookingId)`:
- Returns the existing `video_sessions` row if present.
- Otherwise POSTs to `https://api.daily.co/v1/rooms` with `name = cookalook-{bookingId}` (truncated to 60 chars), `privacy: "public"`, `exp` set to booking end + 30 min, and recording/screenshare/chat enabled.
- On 400/409, re-fetches the existing Daily room.
- Persists `provider: "daily"` in `video_sessions`.

## Fallback
If the Daily API call fails (network, quota, bad key, missing secret), the helper writes a fallback row with `provider: "jitsi_fallback"` and `room_url = https://meet.ffmuc.net/cookalook-{bookingId}#config.prejoinPageEnabled=false`. The call never breaks for the user.

`VideoCall.tsx` renders the Daily prebuilt frame for `daily` and a simple `<iframe>` for `jitsi_fallback`. An "Open in new tab" button is always present for both providers.

## Pre-creation
`send-booking-confirmation` calls the same helper at booking time so the join URL is embedded in the confirmation email (CTA button + plain-text fallback) and in the `.ics` calendar attachment (LOCATION + DESCRIPTION). Both parties always have a working link even if the in-app button has issues.

## Disputes
Recordings are retrieved by admins via the Daily dashboard or REST API when a dispute is opened (per `mem://features/video-recording-disputes`). No automated download into Supabase storage yet.
