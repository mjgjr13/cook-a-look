## Goal

Tighten the backend so nothing leaks beyond what's intentional, and add the visible trust signals clients expect on the path that moves money: browse → advisor profile → book → pay. No visual redesign, no business-logic changes.

Findings come from the Supabase linter + security scanner (1 error, 70 warnings) plus a read of the booking flow.

---

## 1. Backend hardening (migrations)

### Critical
- **Realtime channel authorization (scanner ERROR).** Today, any signed-in user can subscribe to any Realtime topic and receive booking, message, slot, and profile change events for other people. Add RLS policies on `realtime.messages` that restrict topic subscriptions to channels the user owns (their `auth.uid()`, their bookings, their advisor profile). Keep the same set of tables published; only the subscription gate changes.

### High
- **`profiles` email/PII exposure via joins.** `profiles` contains email, `verification_status`, `role`, `referral_code`, `referred_by`, `terms_accepted_at`. Public advisor reads currently go through SECURITY DEFINER functions that select an explicit safe column list — keep those. The fix: drop or scope any RLS policy on `profiles` that lets `authenticated` read rows other than their own, so direct table reads from the client can only return the caller's own row. All public/advisor-facing reads continue through the existing `get_public_advisor_profiles` / `get_advisor_public_profile` / `get_active_published_advisors` RPCs (which already omit email and privileged fields).
- **`advisor_reviews` leaks `client_id`.** Replace the "Anyone can view reviews" policy with a SECURITY DEFINER RPC `get_advisor_reviews(advisor_id)` that returns only `rating`, `review_text`, `created_at`, and a derived reviewer initial/first-name — never `client_id`. Restrict direct table SELECT to the review author and the reviewed advisor.
- **`advisor_meeting_locations` public address dump.** Restrict the "Public can read active locations" policy to `authenticated`, and only return locations whose advisor is approved + listed. Expose via a new SECURITY DEFINER RPC `get_advisor_meeting_locations(advisor_id)` called from the booking calendar so anonymous browsers don't see exact addresses; addresses become visible to logged-in users on the booking step.
- **Leaked-password protection.** Enable HIBP password check on auth so signups/password resets reject known-breached passwords.

### Medium
- **SECURITY DEFINER execute grants (66 warnings).** Audit every `public.*` SECURITY DEFINER function:
  - Keep `EXECUTE TO anon, authenticated` only on functions designed for public reads (the `get_*_advisor*`, `get_available_booking_slots`, `is_slot_available`, `get_public_featured_advisors`).
  - `REVOKE EXECUTE FROM anon, authenticated` and grant to `service_role` only on the rest (internal triggers, `award_client_points`, `redeem_site_credits`, `complete_due_bookings`, `archive_verification_documents`, all `prevent_*` and `validate_*` triggers, `handle_new_user`, `update_*`, `enforce_meeting_location_cap`).
- **Storage bucket listing.** `avatars`, `lookbook`, and `portfolios` are public AND allow `LIST`. Files served by direct URL still work; tighten the `storage.objects` SELECT policy on these three buckets so unauthenticated requests can `getPublicUrl` (read by key) but cannot enumerate the bucket.
- **`pg_trgm` / other extension in public.** Move to the `extensions` schema (cosmetic but flagged).

### Edge functions
- Add Zod input validation + size caps to `create-checkout`, `submit-advisor-application`, `advisor-chat`, `send-*` functions (whatever isn't already validated).
- Confirm every function re-validates the JWT via `supabase.auth.getUser(token)` before trusting `client_id`/`advisor_id` from the body.
- Standardize CORS to an allow-list (preview, custom domain, localhost) instead of `*` where money/PII is involved (`create-checkout`, `verify-payment`, `admin-get-recordings`, `submit-advisor-application`).

---

## 2. Trust signals on browse → profile → book

Read-only additions, no business logic change:

- **Advisor cards (Advisors.tsx, FeaturedAdvisors).** Add a small "Verified" pill next to the name when `verified = true`, and a discreet "Escrowed payment" line in the card footer.
- **Advisor profile (AdvisorProfile.tsx).** Add a "Why booking here is safe" strip above the booking CTA:
  - Identity-verified advisor
  - Payment held in escrow for 48 hours after the session
  - Session is recorded for dispute resolution
  - Refund if the advisor no-shows
  Each item links to the relevant Terms section.
- **BookingCalendar.tsx — pre-checkout summary.** Restate before "Continue to payment": session length, total price (breakdown: hourly × hours [+ in-person surcharge]), meeting type + location/virtual, cancellation window, and a line "You'll be redirected to Stripe — Cook A Look never sees your card details."
- **BookingSuccess.tsx.** Add a "What happens next" panel (confirmation email, calendar invite, how to join, refund/dispute window) so the post-payment moment feels handled.
- **Global footer + sign-in/up.** Surface a "Secure payments by Stripe" + "Privacy & Terms" line; add it under the Stripe redirect button too.

---

## 3. Verification

After migrations apply:
1. Re-run `security--run_security_scan` and `supabase--linter`; the realtime ERROR and the three PII warnings should clear, definer-function warnings should drop sharply.
2. Manual: sign in as user A, try to subscribe to user B's booking channel — expect rejection. Sign out, hit `advisor_meeting_locations` directly — expect empty. Hit `advisor_reviews` directly — expect empty/own only. Read `profiles` as authenticated user for someone else's id — expect empty.
3. Walk browse → profile → book → pay end-to-end and confirm the trust strip, breakdown, and success panel render.

---

## Out of scope (per your answer)

- UX polish beyond the trust strip on the booking path.
- Visual / typography refinement.
- Onboarding, dashboard, payout, dispute, and admin surfaces (we can do those in a follow-up sweep).
