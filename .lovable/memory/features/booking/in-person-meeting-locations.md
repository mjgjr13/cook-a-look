---
name: In-person meeting locations
description: Advisors offering in-person can manage preset meeting spots + surcharge; bookings carry meeting type and location with client-suggested approval flow.
type: feature
---
- `advisor_meeting_locations` table: per-advisor preset spots (e.g. malls), max 5 active. Public read for active rows; advisor/admin manage.
- `profiles.in_person_surcharge` integer 0–100 ($), flat fee added once per in-person booking (NOT per hour).
- Bookings carry `meeting_type` ('virtual'|'in_person'), `location_id`, `suggested_location` jsonb, `location_status` ('confirmed'|'pending_advisor_approval'|'declined'), `in_person_surcharge_cents`, `location_snapshot`.
- `book_slot` RPC validates location ownership & sets `location_status`. Suggested locations go to `pending_advisor_approval`; preset = `confirmed`.
- Advisor dashboard surfaces `PendingLocationApprovals` card: accept (uses suggested) or counter with preset (auto-confirms).
- `create-checkout` enforces meeting type against advisor capabilities and computes surcharge server-side.
- `create-video-room` refuses in-person bookings (no Daily.co room).
- BookingCalendar shows meeting type toggle (only when both offered), location radio list + "suggest another" option.
