# Implementation Plan — Batch 2/3/4

Priority 1 (signup fix + remove liveness skip) is already done. This plan covers the remaining three priorities. I'll do them together — they touch different files and don't interfere.

## 1. Video call: in-page + mobile camera flip

**Problem:** Users report having to open the call in a new tab; mobile users can't flip the camera.

**Approach:**
- Keep Daily.co prebuilt iframe (already mounted in `src/components/VideoCall.tsx`), but:
  - Pass explicit `iframeStyle` + Daily `userName` so the embed reliably starts in-page.
  - Add `allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"` to the iframe wrapper as a safety net.
  - Enable mobile camera flip by passing Daily's `customTrayButtons` for "Flip camera" on mobile (uses `useIsMobile`) and calling `callObject.setInputDevicesAsync` to toggle `facingMode: 'environment' | 'user'` between front/back.
- Remove the "Open in new tab" button — keep it only as a fallback link shown if the embed fails to initialize within 8 s.
- Add a Permissions-Policy meta tag to `index.html` so embedded iframes are granted camera/microphone.

## 2. Location suggestions: Google Places autocomplete + decline flow

**Autocomplete (client-side):**
- Add a new `GooglePlacesAutocomplete` component (Places API New, `Autocomplete (New)` session-token flow) that loads `@googlemaps/js-api-loader` on demand.
- Use it inside the booking flow where the client types a suggested in-person location (currently `LocationAutocomplete` hard-coded city list).
- Store the full Places result (formatted address + place_id + lat/lng) in `bookings.suggested_location` JSONB so advisors see exactly what the client meant.
- Needs `GOOGLE_MAPS_BROWSER_API_KEY` (publishable, restricted to our domains). I'll prompt for it before shipping.

**Decline flow:**
- When an advisor declines a client-suggested location, **do not cancel the booking**. Instead set `bookings.location_status = 'declined_by_advisor'` and notify the client.
- Client dashboard shows a modal (`SuggestedLocationDeclinedModal`) with three options:
  1. Pick one of the advisor's saved meeting locations (lists `advisor_meeting_locations` where `is_active`).
  2. Switch to virtual (only if `advisor.virtual_available`).
  3. Cancel & refund.
- Selecting an option updates the booking server-side via a new `resolve_declined_location` Postgres RPC (atomic: updates `location_id`/`meeting_type`/`location_status`, recalculates surcharge, snapshots address).
- Modal also surfaces from the booking detail card on the dashboard.

## 3. Admin workflow cleanup

Reorganise the admin area around four clear tabs (already exist as separate pages — I'll restructure navigation + dashboards, not rebuild the data model):

- **Approve advisors** — `AdminAdvisors` gets a "Pending review" filter pinned by default, quick-approve / reject buttons, and the verification archive (selfie + ID) shown inline.
- **Financials** — `AdminPayments` adds top-line cards: gross revenue, platform fees, escrow balance, pending payouts. Add CSV export.
- **Session recordings & disputes** — merge `AdminDisputes` with a recordings panel powered by `admin-get-recordings` edge function; each dispute card shows the linked Daily recording with secure signed URL.
- **Clients** — new lightweight `AdminClients` page listing client profiles (search, bookings count, lifetime spend, tier).

`AdminDashboard` becomes a single overview with counts + links into each tab.

## 4. Easier advisor availability

Replace the current multi-component availability page with a simpler flow on `AdvisorAvailability`:

- Default to a "Weekly hours" grid (Mon–Sun rows, single start/end per day, copy-to-all button).
- One-click presets: "Weekdays 9–5", "Evenings 6–10", "Weekends only" (already partly in `QuickSetupPresets` — promote to the top).
- Move advanced controls (breaks, date overrides, blocks) into a collapsible "Advanced" section.
- Show a live preview of the next 7 days of generated slots so the advisor sees exactly what clients will see.

## Technical notes

- New file: `src/components/ui/google-places-autocomplete.tsx`.
- New file: `src/components/booking/SuggestedLocationDeclinedModal.tsx`.
- New file: `src/pages/admin/AdminClients.tsx` + route in `App.tsx`.
- DB migration: add `location_status = 'declined_by_advisor'` handling + `resolve_declined_location(booking_id, mode, location_id?)` RPC. No new tables.
- Edge function update: `create-video-room` already returns Daily URL — no change. Add nothing server-side for camera flip (handled client-side via daily-js `setInputDevicesAsync`).
- Secret needed: `GOOGLE_MAPS_BROWSER_API_KEY` (publishable, domain-restricted). I'll ask for it after the plan is approved.

## Out of scope (ask if you want them)

- Replacing Daily.co with a different provider.
- Custom recording playback UI (we'll use Daily's signed URLs in an HTML5 `<video>`).
- Admin role permissions / multi-admin tiers.
