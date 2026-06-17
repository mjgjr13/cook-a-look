## Cancellation & Refund System for Cook A Look

A complete refund pipeline tied to bookings, with tiered policies, automated Stripe refunds, email notifications, and an admin override panel.

---

### 1. Database changes (migration)

Extend `bookings`:
- `cancelled_by` text — `'client' | 'advisor' | 'admin' | 'system'`
- `cancelled_at` timestamptz
- `cancellation_reason` text
- `refund_percentage` int (0–100)
- `refund_amount_cents` int
- `refund_status` text — `'none' | 'pending' | 'processing' | 'succeeded' | 'failed' | 'voided' | 'manual'`
- `refund_id` text (Stripe refund id)
- `refund_processed_at` timestamptz

New table `refund_events` (audit log):
- `booking_id`, `actor_user_id`, `event_type` (`calculated`, `requested`, `void`, `refund_succeeded`, `refund_failed`, `admin_override`, `manual_refund`), `amount_cents`, `percentage`, `stripe_event_id`, `details jsonb`

RPCs:
- `calculate_refund(p_booking_id uuid, p_canceller text)` → returns `{percentage, amount_cents, reason}`. Pure function applying the tiered policy.
- `cancel_booking_with_refund(p_booking_id uuid, p_reason text)` — replaces the current `cancel_booking`. Determines actor (client vs advisor), computes refund, writes cancellation fields with `refund_status='pending'`, frees the slot, logs `calculated` event, and returns a payload the edge function uses.
- `admin_override_refund(p_booking_id uuid, p_new_percentage int, p_note text)` — admin only. Updates `refund_percentage`/`refund_amount_cents`, sets `refund_status='manual'`, logs `admin_override`.
- `mark_refund_result(p_booking_id, p_status, p_refund_id, p_details)` — service-role only; updates status + logs event. Has duplicate-refund guard: refuses if `refund_status='succeeded'`.

Trigger updates: amend `restrict_booking_participant_updates` to allow the new refund columns only when set by service role / admin / the cancellation RPC.

RLS:
- `refund_events`: participants can SELECT their own; only service role / admin can INSERT.
- Admin SELECT/UPDATE on bookings already covered.

### 2. Refund tier policy

```
Advisor cancels (any time)        → 100%
Client cancels — virtual:
  > 24h                           → 100%
  12h–24h                         → 50%
  1h–12h                          → 25%
  < 1h                            → 0%
Client cancels — in_person:
  > 24h                           → 100%
  12h–24h                         → 50%
  < 12h                           → 0%
No-show (handled separately)      → 0%
```

Hours are computed against `availability_slots.start_time`.

### 3. Edge function `process-booking-cancellation`

Invoked from the client after the cancellation RPC succeeds. Steps:
1. Auth check via JWT.
2. Load booking + payment row.
3. If `payments.stripe_payment_intent_id` exists and intent is uncaptured → `paymentIntents.cancel` (void).
4. Else if captured and `refund_amount_cents > 0` → `refunds.create` with idempotency key `refund:{booking_id}`.
5. Call `mark_refund_result` with success/failure.
6. Enqueue both emails via `send-transactional-email`:
   - `booking-cancelled-client` — refund amount + percent
   - `booking-cancelled-advisor` — informational
7. Always returns structured JSON; failures keep `refund_status='failed'` so admin can retry.

### 4. Email templates

Two new templates registered in `_shared/transactional-email-templates/registry.ts`:
- `booking-cancelled-client.tsx` — shows date, refund %, refund amount, who cancelled.
- `booking-cancelled-advisor.tsx` — confirmation + reason.

### 5. UI

**Client dashboard (`ClientDashboard.tsx`)** — new `CancelBookingDialog`:
- Computes refund preview live via `calculate_refund` RPC.
- Shows: appointment date/time, "Canceling now will refund $X CAD (Y% of your booking fee)".
- Optional reason textarea.
- On confirm → RPC → invoke edge function → toast result.

**Advisor dashboard (`AdvisorDashboard.tsx`)** — replace existing Cancel button with `AdvisorCancelDialog`:
- Warning: "Cancelling will automatically refund the client 100%."
- Same flow.

**Admin panel (`src/pages/admin/Cancellations.tsx`)** — new route `/admin/cancellations`:
- Table of cancelled bookings: date, advisor, client, who cancelled, refund %, amount, status.
- Filters: status, who cancelled, date range.
- Row actions: **Override refund %**, **Retry refund**, **Issue manual refund**.
- **Export CSV** button (client-side from loaded rows).
- Linked from existing admin navigation.

### 6. Edge cases

- Duplicate refund: idempotency key + DB guard on `refund_status='succeeded'`.
- Uncaptured payment → void via `paymentIntents.cancel`, mark `refund_status='voided'`.
- Stripe failure → status `failed`, surfaced in admin; user sees "refund pending review".
- Already-cancelled booking → RPC raises `invalid_state`.
- No payment row (free/demo) → skip Stripe, mark `voided`.

### 7. Files

**New**
- `supabase/migrations/<ts>_cancellation_refunds.sql`
- `supabase/functions/process-booking-cancellation/index.ts`
- `supabase/functions/_shared/transactional-email-templates/booking-cancelled-client.tsx`
- `supabase/functions/_shared/transactional-email-templates/booking-cancelled-advisor.tsx`
- `src/components/booking/CancelBookingDialog.tsx`
- `src/components/advisor/AdvisorCancelDialog.tsx`
- `src/pages/admin/Cancellations.tsx`

**Edited**
- `src/pages/ClientDashboard.tsx`, `src/pages/AdvisorDashboard.tsx`
- `_shared/transactional-email-templates/registry.ts`
- Admin nav + `App.tsx` route

---

### Open question
The `payments` table exists but I haven't read its columns yet — I'll assume `stripe_payment_intent_id`, `amount_cents`, `currency`, `status`. If the actual schema differs I'll adapt during implementation. Want me to proceed?
