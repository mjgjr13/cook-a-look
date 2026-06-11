## Goal

Switch advisor pricing from per-session to per-hour, let clients book 1–3 hours per booking, and rewrite the platform-fee messaging so it's clear the fee drops from 15% to 10% (not 5%) after 9 bookings in a month.

## Changes

### 1. Pricing model: hourly + duration selector

- Reframe `profiles.price_per_session` as the advisor's **hourly rate** throughout the UI (labels, helper text, breakdown). No DB column rename — just relabel and treat the stored number as $/hour.
- `PricingInput.tsx`: change label to "Your Hourly Rate", update helper copy, change the breakdown to show "Hourly rate", and remove the stale "10+ bookings → 5%" footnote (replaced by corrected copy in #3).
- Booking flow: add a **duration picker (1, 2, or 3 hours)** on the advisor's booking page / `BookingCalendar`, defaulting to 1 hour.
  - Client total = `hourly_rate × hours`.
  - Slot selection must reserve `hours × 60` minutes of contiguous availability (still on the 60-min slot grid with the existing 15-min buffer between bookings).
- `create-checkout` edge function:
  - Accept a new `hours` field (validate 1–3, integer).
  - Compute `finalEndTime = finalStartTime + hours*60min` for dynamic slots; for legacy single-slot bookings, require the contiguous slots to be free.
  - Charge `price_per_session × hours` (kept variable name; it now represents hourly rate).
  - Pass `hours` and `total_amount` into booking metadata + Stripe line item description ("X-hour styling session").
- `bookings` table: store the chosen duration. Add a `duration_hours` integer column (default 1, check 1–3) so dashboards, reminders, and the video room know the session length.
- Availability/`book_slot` RPC: extend to accept `p_hours` and atomically lock all contiguous slots (or reject if any are taken). Update `availability_slots` booking logic accordingly.
- Surfaces that display price (advisor cards, advisor profile, dashboards, earnings, admin views): show "$X / hour" instead of "$X / session". Earnings calculations multiply by `duration_hours` where the booking total isn't already stored.

### 2. Session length / video room

- `VideoCall` + `create-video-room`: use `duration_hours` to set room expiry and the displayed session length.
- Reminder + confirmation emails: include the duration ("2-hour session at 3:00 PM").

### 3. Fee-tier copy fix

Current copy implies the fee drops to 5%. Correct rule: **first 9 bookings in a calendar month → 15% fee; from the 10th booking onward in that month → 10% fee.** Update everywhere this is mentioned:

- `PricingInput.tsx` footnote.
- `AdvisorOnboardingModal.tsx` "Payout Schedule" section.
- `AdvisorFeeProgressCard.tsx` (progress + headline copy).
- Any tooltip/help text on advisor earnings page.

Suggested wording: *"Standard fee is 15%. After your 9th completed booking in a calendar month, every additional booking that month is charged a reduced 10% fee."*

### 4. Fee calculation logic

- `calculatePlatformFee` in `useProfile.ts`: keep the 9-booking threshold but change the reduced rate from the current value to **10%** (not 5%). Apply per-booking: bookings 1–9 = 15%, booking 10+ = 10%.
- Confirm the server-side equivalent (any edge function or DB function computing payouts) uses the same 15% / 10% split. Update `mark-completed-bookings` / payout logic if needed.
- Update memory file `mem://features/payments/platform-fee-structure` to reflect 15% → 10% (not 5%).

## Technical notes

- DB migration: `ALTER TABLE bookings ADD COLUMN duration_hours int NOT NULL DEFAULT 1 CHECK (duration_hours BETWEEN 1 AND 3);` plus an updated `book_slot` function signature.
- Backfill: existing bookings get `duration_hours = 1`.
- No rename of `price_per_session` to avoid a wide-blast-radius refactor; add a code comment that it now represents hourly rate. (Optional follow-up: rename in a later pass.)
- Keep the 15-minute buffer rule between consecutive bookings regardless of duration.

## Out of scope

- Renaming the `price_per_session` column.
- Changing the 48-hour escrow window or dispute flow.
- Sub-hour bookings or durations > 3 hours.

## Question

Memory currently says the reduced fee is **5%** after 9 bookings, and that's wired into the app. Your message says it should be **10%**. I'll change it to 10% across UI + logic + memory — confirm that's the intended rate (not 5%) before I build.
