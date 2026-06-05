## Goal
Keep Daily.co as primary video provider, but auto-fallback to a Google Meet link whenever Daily.co fails (currently failing due to invalid API key) so clients can always join the call.

## Changes

### 1. Edge function: `supabase/functions/create-video-room/index.ts`
- On any Daily.co failure (auth error, 5xx, network throw), instead of returning 500, return HTTP 200 with:
  ```json
  { "fallback": true, "provider": "google_meet", "roomUrl": "https://meet.google.com/new" }
  ```
- Persist the fallback `roomUrl` + `room_name` (`gmeet-<bookingId>`) into `video_sessions` so the same link is reused on rejoin.
- Successful Daily.co path unchanged but response now includes `provider: "daily"`.

### 2. Database (small migration)
- Add nullable column `video_sessions.provider TEXT DEFAULT 'daily'` so we can distinguish sessions (no behavior change for existing rows).

### 3. Frontend: `src/components/VideoCall.tsx`
- Read `provider` / `fallback` from the response.
- If `provider === "google_meet"`:
  - Don't render the iframe (Google Meet blocks embedding).
  - Show a clean dialog: short note "Your session uses Google Meet" + a primary `Open Google Meet` button that opens `roomUrl` in a new tab.
  - Keep the End Call button so client-review flow still triggers.
- Daily.co path renders the iframe exactly as today.

### 4. Memory update
- Update `mem://technical/video-provider` to note: Daily.co primary, Google Meet automatic fallback when Daily.co is unavailable; recordings only exist on Daily.co sessions.

## Out of scope
- Not generating real Google Calendar Meet rooms (requires Google OAuth per user). We use `https://meet.google.com/new` which creates an ad-hoc room on click — both parties join the same booking link stored in `video_sessions`. If you later want unique pre-provisioned Meet rooms, that needs a Google Workspace connector.
- Not fixing the Daily.co key itself. Once you paste a valid `DAILY_API_KEY`, the primary path resumes automatically.

## Technical notes
- `meet.google.com/new` always creates a fresh room for the first opener; to ensure both parties land in the SAME room we'll generate one Meet link the first time anyone opens the session (the first opener's `/new` redirects to a real URL — but we can't capture that server-side). Practical approach: store a shared placeholder and instruct the advisor to paste the actual Meet URL into the booking chat the first time, OR the first opener shares the URL via chat. This is the limitation of using free Meet without OAuth.
  - Recommended: show both parties the same `meet.google.com/new` link + a one-line instruction to share the generated URL via the existing in-booking chat. Chat is already implemented in `BookingChat`.
