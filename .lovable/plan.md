## Goal

Make in-person bookings actually in-person. Today, even when an advisor offers in-person, the booking flow treats every session as virtual. Advisors who offer in-person (or hybrid) should be able to (1) list a few preset meeting spots (e.g. local malls), (2) charge an optional in-person surcharge up to $100, and clients should pick one of those spots — or propose a nearby alternative for the advisor to approve/decline. Pure virtual advisors are unchanged.

## Changes

### 1. Advisor setup: meeting locations + surcharge

- New table `advisor_meeting_locations` (one row per spot) with `advisor_id`, `name` (e.g. "Westfield Valley Fair"), `address`, `city`, `notes`, `is_active`, `sort_order`.
- New column `profiles.in_person_surcharge` (integer cents/dollars, default 0, max 100) — flat fee added per in-person booking (not per hour).
- Onboarding + Account Settings (`BecomeAdvisor.tsx`, `AccountSettings.tsx`):
  - Only show the locations + surcharge UI when the advisor has `in_person_available = true`.
  - "Where you meet clients" section: add/remove up to ~5 preset spots (name + address required). At least 1 required to turn in-person on / go live.
  - "In-person surcharge" input ($0–$100, helper text: "Flat fee added to in-person bookings on top of your hourly rate").
- Profile completion / listing visibility checklist: in-person advisors aren't "ready to go live" until they have ≥1 active location.

### 2. Booking flow: meeting type + location picker

- `BookingCalendar.tsx`: after date/slot/duration, show a **Meeting type** selector based on advisor's offerings:
  - Virtual-only advisor → no selector, behaves like today.
  - In-person-only → forced to in-person; show location picker.
  - Hybrid → radio toggle (Virtual / In-person); in-person reveals the picker.
- **Location picker** for in-person:
  - Radio list of the advisor's active preset locations (name + address).
  - "Suggest another location" option → text input for venue name + address + optional note.
- Pricing summary updates live: `hourly_rate × hours` + (`in_person_surcharge` if in-person).
- `create-checkout` edge function: accept `meetingType` ("virtual" | "in_person"), `locationId` (preset) or `suggestedLocation` (free-text), validate against advisor's offerings, recompute price server-side including surcharge, store on the booking.

### 3. Bookings record + approval for client-suggested locations

- Add to `bookings`: `meeting_type` ('virtual' | 'in_person'), `location_id` (FK, nullable), `suggested_location` (jsonb: {name, address, note}, nullable), `location_status` ('confirmed' | 'pending_advisor_approval' | 'declined'), `in_person_surcharge_cents`.
- Preset location → `location_status = 'confirmed'` immediately, booking proceeds as normal.
- Suggested location → `location_status = 'pending_advisor_approval'`. Booking is still paid + reserved (slot held), but advisor gets a notification + an action card on their dashboard to **Accept** or **Decline**:
  - Accept → status becomes `confirmed`, suggested location is saved as the official meeting place.
  - Decline → advisor picks one of their preset locations as a counter, status becomes `confirmed` with that preset (client is notified via email + in-app). Optional follow-up: full cancel/refund path if client rejects the counter — out of scope for v1, just leave a note in the booking chat.
- Client booking confirmation + reminder emails (`send-booking-confirmation`, `send-session-reminders`): show meeting type, address (or "Pending advisor confirmation"), and surcharge line item. Skip Daily.co video room creation for in-person bookings.

### 4. UI surfaces to update

- Advisor profile page (`AdvisorProfile.tsx`) + cards (`Advisors.tsx`, `FeaturedAdvisors.tsx`): if in-person is offered, show "Meets at: <city list>" and surcharge note ("+ $X for in-person").
- Booking details modal (`BookingDetailsModal.tsx`), dashboards (`Dashboard.tsx`, `AdvisorDashboard.tsx`), admin views (`AdminBookings.tsx`): display meeting type, address, and surcharge.
- Today's call buttons: only show "Join video" for virtual bookings; in-person bookings show "View location" instead.

### 5. Validation + edge cases

- If an advisor turns off in-person, existing in-person bookings stay valid (use stored snapshot of address); new bookings can't pick in-person.
- Surcharge is enforced server-side in `create-checkout` (never trusted from client).
- Suggested-location text fields capped (e.g. 200 chars each) and sanitized.

## Technical notes

- Migration: create `advisor_meeting_locations` with grants + RLS (public read for active locations of approved+listed advisors; advisor manage own; admin all). Add the `bookings` and `profiles` columns. Backfill existing bookings to `meeting_type = 'virtual'`, `location_status = 'confirmed'`.
- `book_slot` RPC: extend to accept `p_meeting_type`, `p_location_id`, `p_suggested_location`, `p_surcharge_cents`, write them onto the booking row atomically.
- `create-video-room` / video session triggers: gate on `meeting_type = 'virtual'`.

## Out of scope

- Map/geocoding for suggested locations (free-text only for v1).
- Full cancel/refund flow if client rejects advisor's counter-location.
- Per-location pricing (single surcharge applies to all in-person spots).
- Travel-distance validation.

## Questions

1. **Max preset locations per advisor?** I suggested 5 — sound right, or different cap?
2. **When advisor declines a client-suggested location**, is "advisor picks a preset as counter, booking auto-confirms at that preset, client notified" acceptable for v1, or should the client get a chance to accept/reject the counter (with refund if they reject)?
