# Fix: Liveness Camera Stuck on "Starting camera..."

## Root cause

In `src/components/LivenessCamera.tsx`, when the user clicks **Start Camera**, `startCamera()`:
1. Sets `step = "initializing"` — which causes the JSX to render the spinner *instead of* the `<video>` element.
2. Acquires the MediaStream successfully (console confirms "Stream acquired").
3. Tries to assign the stream to `videoRef.current` — but the `<video>` tag is unmounted, so the ref is `null`.
4. The code hits the `if (!videoRef.current)` guard, but by then React's StrictMode has fired a second pass and the UI is stuck showing "Starting camera...". The `onloadedmetadata` event never fires because the stream never reaches a video element.

## Fix

Always keep the `<video>` element mounted while the camera flow is active, and use CSS to show/hide it based on `step`. This guarantees `videoRef.current` is available the moment the stream is acquired.

### Changes (single file: `src/components/LivenessCamera.tsx`)

1. **Render `<video>` unconditionally** inside the camera container (not gated by step). Overlay the "ready" placeholder and "initializing" spinner on top of it using absolute positioning.
2. Keep the existing flow (`ready` → `initializing` → `detecting` → `blink` → `turn` → `capturing` → `complete`) but treat the conditional UI as overlays, not replacements.
3. Add a small `requestAnimationFrame` / `await new Promise(r => setTimeout(r, 0))` before `getUserMedia` is unnecessary now — the video element exists from the start, so the existing code path works.
4. Defensive: if `onloadedmetadata` doesn't fire within 8s, still attempt `video.play()` once as a fallback before erroring out.

No backend, schema, or other component changes. Liveness step logic, fallback upload, retry counter, and 12s timeout all remain intact.

## Verification

- Open `/become-advisor`, reach the liveness step, click **Start Camera**.
- Expected: browser permission prompt → live video preview → Blink prompt within ~1.5s.
- Console should log `Video metadata loaded` and `Video playing successfully`.
- Fallback "Upload Photo" still appears after 2 failed attempts.
