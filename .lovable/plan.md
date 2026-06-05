# Cook A Look — 7-Day MVP Build Plan (finalized)

Decisions locked from your answers:
- **Payouts:** manual, but advisor earnings dashboard stays visible
- **Verification:** keep liveness camera, but optional (manual review primary)
- **Scope:** keep rewards, referrals, AI concierge, featured placement visible
- **Auth:** add Google sign-in

Goal: first real paid consultation completed end-to-end in 7 days. No refactors. Critical path only.

---

## Day 1 — Booking atomicity (DB)

Single migration:
- Add unique partial index on `availability_slots (advisor_id, start_time) WHERE is_booked = true` to prevent double-book.
- Create `book_slot(advisor_id, start_time, end_time, client_id, is_virtual)` SECURITY DEFINER function that:
  1. Locks slot row, inserts `availability_slots` row with `is_booked=true` if free (or fails),
  2. Inserts `bookings` row (`status='pending'`, returns booking_id),
  3. Returns `{ booking_id, slot_id }`.
- GRANT execute to `authenticated`.

UI/edge:
- `create-checkout`: call `book_slot` first; pass `booking_id` into Stripe `metadata`. If slot taken, return 409 to frontend (toast "slot just got taken, pick another").

## Day 2 — verify-payment + Join Meeting CTA

- `verify-payment`: on Stripe success, flip `payments.status='completed'`, `bookings.status='confirmed'`, set `escrow_release_at = now() + 48h`. Idempotent (re-runs safe).
- Add `JoinConsultationButton` component, shown on `Dashboard` and `AdvisorDashboard` for any `confirmed` booking whose slot start is within `[T-15min, T+90min]`. Opens existing `VideoCall` modal.
- Remove placebo Mic/Video buttons in `VideoCall.tsx` (Daily iframe owns its own controls).

## Day 3 — Completion + reminders

- New edge function `mark-completed-bookings` (scheduled hourly via Supabase scheduled function or a cron route + external pinger): flips `bookings.status='completed'` and `completed_at=now()` where slot end_time < now() and status='confirmed'. Existing triggers then fire rewards + monthly stats.
- New edge function `send-session-reminders`: 1h before slot start, send Resend email to both parties with the Join link.
- Verify post-call review modal still fires from `VideoCall` after session ends.

## Day 4 — Google sign-in

- Call `supabase--configure_social_auth` to enable Google.
- Replace `signInWithPassword` flow's social slot in `SignIn.tsx` and `SignUp.tsx` with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Keep email/password intact.

## Day 5 — Payout honesty + verification toggle

- Keep `AdvisorEarnings` page. Add prominent banner: "Payouts processed manually within 7 days of session completion. Email support@cookalook.com to request withdrawal." Wire `withdrawal_requests` insert from existing UI; admin processes via Stripe dashboard manually.
- Liveness: ensure `liveness_verified` is optional everywhere; admin can approve advisor without it (already MVP-flagged per memory — just verify).
- Admin: confirm `AdminAdvisors` shows pending list with one-click approve.

## Day 6 — End-to-end dry run (test mode)

- Self-book as a test client → Stripe test card → both devices join Daily room → end call → wait for completion cron → verify review prompt + advisor earnings line item + escrow release timestamp.
- Fix any red.

## Day 7 — Soft launch

- Swap Stripe to live keys.
- Invite 5 clients + 2 advisors.
- Watch edge function logs hourly for 48h.

---

## Order of implementation

DB migration (Day 1) → edge functions (Days 1–3) → UI CTAs (Day 2) → auth (Day 4) → polish (Day 5) → test (Day 6) → ship (Day 7).

## Non-goals (explicitly NOT doing)

- Stripe Connect / automated payouts
- Refactoring dual advisor tables
- Hiding rewards/referrals/AI/featured (per your call)
- Real-time Daily.co recording webhook ingestion (post-MVP)
- Dispute UI improvements

## Risk + rollback

- All Day 1 DB changes additive (new index, new function). Rollback = drop them.
- All new edge functions independent; rollback = unschedule cron or remove buttons.
- Google sign-in additive; email/password remains.
- Stripe stays in test mode until Day 6 passes.

## Files I will touch (preview)

- `supabase/migrations/<new>.sql` (book_slot, unique index)
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `supabase/functions/mark-completed-bookings/index.ts` (new)
- `supabase/functions/send-session-reminders/index.ts` (new)
- `src/components/booking/JoinConsultationButton.tsx` (new)
- `src/pages/Dashboard.tsx`, `src/pages/AdvisorDashboard.tsx`
- `src/components/VideoCall.tsx` (strip placebo controls)
- `src/pages/SignIn.tsx`, `src/pages/SignUp.tsx`
- `src/pages/AdvisorEarnings.tsx` (manual-payout banner)

Approve and I'll start with the Day 1 migration.
