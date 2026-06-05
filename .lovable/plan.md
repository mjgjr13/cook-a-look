# Cook A Look — State of the Union Audit

## 1. Executive Summary

You have a **surprisingly complete marketplace** — auth, profiles, advisor onboarding, listings, availability, Stripe checkout, Daily.co video, reviews, disputes, rewards, admin dashboards, transactional emails. Build does compile, 2 payments completed, 4 advisors listed.

**But you have zero completed bookings and zero video sessions ever started.** That tells the real story: the funnel reaches "pay" but breaks (or just hasn't been exercised) at *book → meet → complete → review → payout*. You also carry a **lot of half-built complexity** (rewards/credits/tiers, dual onboarding tables, archive PII flows, demo-mode toggles) that is not on the path to first paid consultation.

**Risk score: 6.5 / 10.** Core works in isolation. The integration seam between booking → payment → slot lock → video room → completion is fragile and untested end-to-end.

**Recommendation:** Do not refactor. Cut scope hard, force one happy-path through, replace the custom video room with a Daily.co prebuilt link (already what you're doing — keep it), and ship.

---

## 2. Architecture Map

```text
Frontend (Vite + React 18 + TS + Tailwind + shadcn)
  src/pages/*           24 routes (public + client + advisor + admin)
  src/contexts/Auth     supabase.auth + onAuthStateChange
  src/hooks/useProfile  single source of truth for roles
  src/components/
    booking/            BookingCalendar, BookingChat, BookingDetailsModal
    advisor/            Availability, Portfolio, Onboarding, Verification
    video/              RecordingConsentModal
    VideoCall.tsx       Daily.co iframe wrapper
    chat/AdvisorChatbot Gemini concierge
  react-helmet-async@2  SEO (just downgraded for React 18)
  react-query, framer-motion, dnd-kit, embla

Backend (Lovable Cloud / Supabase)
  Auth: email+password, (Google planned per memory)
  DB: 28 public tables, RLS on everything, GRANTs in place
       Two parallel "advisor" sources of truth:
         - profiles (legacy flags: is_advisor, advisor_approved, rating, etc.)
         - advisor_profiles (newer: application_status, onboarding_status, is_listed)
       Sync via sync_advisor_status trigger
  Storage: avatars (public), portfolios (public), lookbook (public), verifications (private)
  Edge functions (10):
    create-checkout, verify-payment        (Stripe)
    create-video-room                      (Daily.co)
    submit-advisor-application
    send-{signup,booking,advisor,chat}-*   (Resend)
    advisor-chat                           (Lovable AI / Gemini)

Integrations
  Stripe (manual checkout, tax disabled per memory)
  Daily.co (rooms, recordings)
  Resend (transactional email)
  Lovable AI Gateway (Gemini for concierge)

Deployment
  Lovable hosting, custom domain cookalook.com (+ www), preview on lovable.app
  Sitemap auto-generated pre-build, robots.txt, llms.txt present
```

**Data reality (live DB):** 16 profiles, 7 advisors, 4 listed, 11 applications, **1 booking, 0 completed, 2 payments, 0 video sessions.**

---

## 3. Feature Status Report

### ✅ WORKING
| Feature | Notes |
|---|---|
| Auth (email/password) | AuthContext + onAuthStateChange pattern is correct |
| Profile + role resolution | `useProfile` derives roles from `user_roles` + `advisor_profiles` |
| Advisor browse + profile pages | `get_public_advisor_profiles` RPC, SEO + JSON-LD |
| Lookbook (admin-managed) | CRUD + categories |
| Availability engine | Windows, breaks, date overrides, blocks, `get_available_booking_slots` |
| Stripe checkout creation | `create-checkout` edge function |
| Admin dashboards | Bookings, advisors, payments, rewards, lookbook |
| RLS posture | Tight, security-definer RPCs for public reads |
| SEO foundations | Seo component, sitemap, JSON-LD, OG image |
| Transactional emails | Resend wired for signup/booking/chat/advisor |

### 🟡 PARTIALLY WORKING
| Feature | Gap |
|---|---|
| **Advisor verification** | Camera/liveness exists, but `liveness_verified` largely optional per MVP memory; review flow manual; archive trigger removes URLs on approve — admins lose ability to re-verify |
| **Booking flow** | Slots generated but `bookings.slot_id` requires a pre-existing `availability_slots` row; the `is_slot_available` RPC and `get_available_booking_slots` use **different** sources (slots table vs windows). High risk of "no slot found" or double-book |
| **Payments → booking link** | `verify-payment` must flip payment + create booking + lock slot atomically; needs reverification |
| **Video call** | `create-video-room` works; but no UI surfaces a "Join" button reliably from the client side until booking.status='confirmed' |
| **Escrow / payouts** | Schema is there (escrow_status, escrow_release_at, withdrawal_requests) but no scheduler/cron to release after 48h |
| **Reviews** | `can_leave_review` requires `bookings.status='confirmed'` AND slot end_time < now — works, but no booking has reached that state |
| **Dual role state** | `profiles.is_advisor` vs `advisor_profiles.application_status` — sync trigger exists but easy to desync via direct updates |
| **Rewards / site credits** | Schema + RPCs in place, redemption not wired into checkout |

### ❌ BROKEN / RISKY
| Feature | Why |
|---|---|
| **End-to-end booking** | 0 completed bookings, 0 video sessions — never exercised live |
| **Slot atomicity** | No DB unique constraint preventing two bookings on same slot; relies on `is_booked` flag + app logic |
| **Booking completion** | No trigger/cron flips `status='completed'` after session end → rewards/reviews/payouts never fire |
| **Escrow release** | No cron job → funds stuck in 'held' indefinitely |
| **Google OAuth** | Memory says default, not wired in current AuthContext |
| **Withdrawal flow** | Manual only; no Stripe Connect → payout is a spreadsheet exercise |
| **Profile RLS for public** | Public advisor reads go via RPC only; `profiles` SELECT is "own only" — anything joining profiles client-side from anon will fail. Confirm all advisor pages use the RPC. |

### 🚫 MISSING (for first paid consultation)
- Cron / scheduled function to mark bookings completed
- Cron to release escrow after 48h
- "Join meeting" CTA in client + advisor dashboards keyed off start_time window
- Post-call automatic recording URL capture from Daily webhook
- Refund path on dispute
- Real Stripe Connect (or explicit "manual payout" UX so advisors understand)

---

## 4. User Flow Audit

### Client: Landing → Signup → Browse → Book → Pay → Join
1. Landing ✅
2. Signup ✅ (email/password; Google missing)
3. Browse advisors ✅ (RPC-backed)
4. Open advisor profile ✅ (sticky mobile CTA, JSON-LD)
5. Pick slot — ⚠️ depends on `get_available_booking_slots` returning correct slots; this RPC generates virtual slots but does NOT create `availability_slots` rows; bookings FK requires `slot_id` → **likely failure point**
6. Pay (Stripe checkout) — ✅ session created; ⚠️ on success `verify-payment` must insert `availability_slot` + `booking` + `payment` row consistently
7. Booking success page ✅
8. Join meeting — ❌ no obvious UI to launch `VideoCall` from client dashboard at session time

### Advisor: Signup → Verification → Profile → Availability → Accept → Meeting
1. Signup as advisor (BecomeAdvisor) ✅
2. Submit application — ✅ via `submit-advisor-application`
3. Admin approves in AdminAdvisors ✅
4. Onboarding modal acknowledgment ✅
5. Profile photos, portfolio, pricing, categories ✅
6. Set availability windows/breaks/overrides ✅
7. Toggle `is_listed` to go live ✅
8. "Accept booking" — ⚠️ bookings auto-confirm on payment; no explicit accept step. Advisor sees it in dashboard.
9. Join meeting — ❌ same gap as client side

**Failure points (ranked):**
1. Slot creation vs slot lookup mismatch (windows-generated vs DB rows)
2. verify-payment atomicity (booking + slot lock + payment)
3. No "Join now" CTA tied to session start
4. No completion trigger → review/escrow/rewards never fire
5. Google sign-in missing → conversion friction
6. Withdrawal is manual → advisors will churn

---

## 5. Unnecessary Complexity to Cut

Flag for removal / deferral until post-MVP:

- **Rewards system** (points, tiers, site credits, Insider/VIP) — 4 tables, RPCs, triggers. **Disable in UI**, keep schema.
- **Referrals** — same. Defer.
- **Dispute UI** — keep DB, hide UI; resolve manually for now.
- **AI Concierge (Gemini chatbot)** — nice-to-have, costs tokens, not on critical path. Hide.
- **Featured advisors paid placement** — premature monetization. Hide.
- **Liveness camera + ID archive** — replace with "upload selfie + ID" manual admin review. Memory already notes MVP simplification.
- **Dual advisor tables** — DO NOT refactor now, but stop adding fields to `profiles` for advisor data.
- **Custom video controls (mute/video buttons in VideoCall.tsx)** — those buttons don't actually control the iframe. Remove them or rely on Daily prebuilt UI. **You already use Daily prebuilt iframe** — keep, drop the fake controls.
- **Lookbook** — keep if curated content drives SEO; otherwise defer.
- **Advisor earnings dashboard** — defer; show "contact us for payout" until Stripe Connect.

**Keep custom video?** Yes — you're using Daily.co prebuilt rooms via iframe, which IS the external solution. Don't switch. Just delete the placebo Mic/Video buttons in `VideoCall.tsx`.

---

## 6. 7-Day Launch Plan (first paid consultation only)

**Day 1 — Booking atomicity**
- Unify slot creation: when `verify-payment` succeeds, insert `availability_slots` row (start/end from chosen slot) **and** `bookings` row in one transaction (Postgres function with `SELECT ... FOR UPDATE` or unique constraint on `(advisor_id, start_time)`).
- Add unique index to prevent double-book.

**Day 2 — Join meeting UX**
- Add "Join Consultation" button on Client Dashboard and Advisor Dashboard, enabled from T-10min to T+90min of slot start. Wire to existing `VideoCall` modal.
- Send reminder email 1h before via scheduled function.

**Day 3 — Completion + review trigger**
- Scheduled function (or DB cron via pg_cron if available, else daily edge function) that marks bookings `completed` when slot end_time < now() and status='confirmed'.
- Confirm review modal appears post-call.

**Day 4 — Google sign-in + signup polish**
- Enable Google provider; add button to SignIn/SignUp.
- Sanity-check all transactional emails fire.

**Day 5 — Payment/escrow honesty**
- Hide rewards, referrals, featured, AI concierge, advisor earnings UI behind feature flag.
- Replace earnings page with "Payouts processed manually within 7 days of completed session — email support@cookalook.com".
- Document manual payout SOP for yourself.

**Day 6 — End-to-end dry run**
- You book yourself → pay with Stripe test → join Daily room from two devices → end → mark complete → verify review prompt + advisor sees earnings.
- Fix anything red.

**Day 7 — Soft launch**
- Switch Stripe to live keys.
- Invite 5 friendly clients + 2 advisors.
- Monitor edge function logs hourly.

---

## 7. Safe Change Strategy

**Highest-risk areas (touch with surgical care):**
1. `verify-payment` edge function — money + slot lock
2. `useProfile` + `AuthContext` — any change cascades to every route guard
3. `sync_advisor_status` trigger + dual advisor tables — desync = invisible advisors
4. RLS policies on `bookings`, `payments`, `availability_slots`
5. `get_available_booking_slots` RPC — booking surface

**Do NOT touch:**
- `src/integrations/supabase/client.ts` and `types.ts` (auto-generated)
- `.env`, `supabase/config.toml`
- Existing migrations
- RLS policies unless adding (never broadening anon)
- The `profiles` ↔ `advisor_profiles` sync trigger

**Order of implementation:** DB constraints → edge function fixes → UI CTAs → email/cron → cleanup/feature-flag hiding. Schema before code before UI before polish.

**Rollback recommendations:**
- Every migration: include a `DOWN` script in your notes (Supabase migrations are forward-only, so wrap risky changes in a feature flag column you can flip).
- Hide-by-flag instead of delete for rewards/referrals/AI/featured — zero-cost rollback.
- Keep Stripe in test mode until Day 7 dry run passes.
- Tag a git commit `pre-mvp-cutover` before Day 1.

---

## 8. Top 10 Next Actions

1. Add unique index `(advisor_id, start_time)` on `availability_slots` to prevent double-booking
2. Rewrite `verify-payment` to insert slot+booking+payment atomically (single SECURITY DEFINER function)
3. Add "Join Consultation" CTA on both dashboards, gated by slot time window
4. Build scheduled completion job (mark `bookings.status='completed'` after end_time)
5. Wire Google OAuth in `AuthContext` + SignIn/SignUp buttons
6. Feature-flag and hide: rewards, referrals, AI concierge, featured advisors, advisor earnings detail
7. Replace fake Mic/Video buttons in `VideoCall.tsx` with Daily prebuilt-only controls
8. Send reminder email 1h before session (scheduled edge function)
9. Document manual payout SOP and add static "Payouts" page
10. End-to-end live dry run with two real devices on Stripe live keys

---

## 9. Recommended Stack Changes

- **Keep:** React 18, Vite, Tailwind, shadcn, Supabase, Stripe, Daily.co, Resend, Lovable AI. All correct choices.
- **Add later (not now):** Stripe Connect for real advisor payouts; pg_cron or a scheduled edge function runner; Sentry for error tracking; PostHog for funnel analytics.
- **Defer / remove from UI:** rewards engine, referrals, AI concierge, featured advisor paid placement, custom liveness camera.
- **Do NOT switch:** video provider (Daily prebuilt is already the right answer), database, framework.

---

## Clarifying Questions Before You Greenlight Build Mode

1. **Stripe Connect** — are you OK launching with **manual payouts** (you Venmo/wire advisors weekly) so we skip Connect onboarding entirely for MVP?
2. **Verification** — comfortable dropping liveness camera and reverting to "upload selfie + government ID, admin reviews manually"?
3. **Scope cuts** — green light to hide rewards, referrals, AI concierge, and featured-advisor placement behind a feature flag for launch?
4. **Google sign-in** — should I enable it on Day 4, or are you fine email/password-only for the first 5 customers?

Answer these and I'll convert this into a concrete build plan.
