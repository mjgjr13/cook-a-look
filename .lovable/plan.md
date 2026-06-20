## Current state (already in place)

- **Edge function `create-video-room`** already calls `https://api.daily.co/v1/rooms` using `DAILY_API_KEY` (confirmed present in Supabase secrets) and returns `{ roomUrl, roomName, provider: "daily" }`.
- **`VideoCall.tsx`** already embeds the Daily.co prebuilt UI in-app via `@daily-co/daily-js` — no redirect, no new tab.
- Jitsi (`meet.ffmuc.net`) is wired only as an automatic fallback if the Daily API call fails (bad key, quota, network) — matches your "unless Daily fails" rule.

## Change to make

The only thing that violates "users must NOT be redirected to another website or new tab" is a leftover **"Open in new tab"** button rendered in the call's footer for both providers.

**Edit `src/components/VideoCall.tsx`:**
- Remove the "Open in new tab" `<Button>` (and the now-unused `ExternalLink` icon import) so the call is strictly embedded.
- Leave the Daily embed, recording-consent flow, mobile camera flip, and end-call button untouched.
- Leave the Jitsi `<iframe>` fallback branch in place (still embedded, no new tab) so users aren't stranded if Daily ever errors.

## Not changing

- No edge-function changes — it already matches the spec.
- No database changes.
- `DAILY_API_KEY` is already configured; nothing to add.
- Jitsi fallback code stays as a silent safety net (only triggers when Daily fails); removing it entirely would mean a hard error instead of a working call in that edge case.

## Verification

After the edit: open a booking's video call → confirm the Daily UI mounts in the modal and there is no longer any button that opens an external tab.
