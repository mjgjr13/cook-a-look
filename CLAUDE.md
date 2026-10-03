# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cook A Look (cookalook.com) — a two-sided marketplace connecting clients with style advisors for video and in-person styling sessions. Originally scaffolded and still actively edited via [Lovable](https://lovable.dev) (`.lovable/` directory holds Lovable's persistent project memory — see below).

## Commands

```sh
npm i               # install deps
npm run dev          # start Vite dev server on :8080 (runs predev sitemap generation first)
npm run build         # production build (runs prebuild sitemap generation first)
npm run build:dev     # development-mode build
npm run lint          # eslint .
npm run preview       # preview a production build
```

There is no test suite configured in this repo.

Edge functions (`supabase/functions/*`) are Deno-based Supabase Edge Functions, deployed via the Supabase CLI (`supabase functions deploy <name>`), not built/run by the Vite toolchain. Each function's JWT-verification requirement is set per-function in `supabase/config.toml` (`verify_jwt`), not in code.

## Tech stack

- **Frontend**: Vite + React 18 + TypeScript, React Router v7, TanStack Query, react-hook-form + zod, Tailwind CSS + shadcn-ui (Radix primitives), framer-motion.
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions). Edge Functions are Deno, written in TS, importing Stripe/Supabase client libs from `esm.sh`.
- **Payments**: Stripe, called only from Edge Functions (see Conventions below).
- **Video**: Daily.co (`@daily-co/daily-js`, prebuilt UI) is primary; falls back automatically to a Jitsi room (`meet.ffmuc.net`) if the Daily API call fails. See `.lovable/memory/technical/video-provider.md`.
- **Email**: Resend, called from several `send-*` Edge Functions.
- **Auth**: Supabase Auth, plus an additional Lovable-hosted OAuth wrapper (`@lovable.dev/cloud-auth-js`) in `src/integrations/lovable/index.ts` for Google/Apple/Microsoft/Lovable sign-in, which then hands the resulting tokens to `supabase.auth.setSession`.

## Key directories

- `src/pages/` — top-level route components (React Router). `src/pages/admin/` holds admin-only routes.
- `src/components/` — organized by feature/domain: `admin/`, `advisor/`, `advisors/`, `auth/`, `booking/`, `chat/`, `dashboard/`, `disputes/`, `home/`, `layout/`, `profile/`, `reviews/`, `video/`, plus `ui/` for shadcn primitives (generally not hand-edited).
- `src/hooks/` — data-fetching/domain hooks (e.g. `useAdvisorAvailability`, `useAdvisorBreaks`, `useLookbookItems`, `useProfile`).
- `src/contexts/AuthContext.tsx` — auth/session context provider.
- `src/integrations/supabase/` — `client.ts` (Supabase client, reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from env) and `types.ts` (auto-generated DB types — do not hand-edit; regenerate via Supabase CLI).
- `src/integrations/lovable/` — Lovable OAuth wrapper (auto-generated, do not hand-edit).
- `src/lib/` — `utils.ts`, `validations.ts` (zod schemas), `phone-utils.ts`.
- `supabase/functions/` — one directory per Edge Function, plus `_shared/` (`cors.ts` for CORS headers, `daily.ts` for the Daily.co room helper `getOrCreateVideoRoomForBooking`).
- `supabase/migrations/` — timestamped SQL migrations (Lovable-generated filenames: `<timestamp>_<uuid>.sql`). This is the source of truth for schema, RLS policies, and DB functions/triggers.
- `.lovable/memory/` — persistent project notes written by Lovable across sessions, split into `features/` and `technical/`. Check here first for non-obvious business rules before re-deriving them from code (e.g. platform fee tiers, in-person location rules, the June 2026 security-hardening pass).
- `scripts/generate-sitemap.ts` — runs automatically before `dev`/`build` via `predev`/`prebuild`.

## Database schema (high level)

Core marketplace tables: `profiles` (both clients and advisors, with advisor-specific columns like `is_advisor`, `advisor_approved`, `price_per_session`, `virtual_available`, `in_person_available`, `in_person_surcharge`), `bookings`, `availability_slots`, `advisor_availability_windows`, `advisor_availability_breaks`, `advisor_date_overrides`/`advisor_date_blocks`.

Payments/financial: `payments`, `refund_events`, `withdrawal_requests`, `reward_settings`, `advisor_monthly_stats`, `user_rewards`, `point_transactions`, `site_credits_log`, `referrals`.

In-person sessions: `advisor_meeting_locations` (max 5 active per advisor).

Video: `video_sessions` (tracks Daily/Jitsi room + provider per booking).

Content/marketing: `lookbook_categories`, `lookbook_items`, `featured_advisors`, `advisor_reviews`.

Support/ops: `disputes`, `booking_messages`, `admin_messages`, `advisor_applications`, `advisor_verification_archive`, `user_roles`.

Email infra: `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` (queue-based email sending processed by `process-email-queue`).

Most privileged writes go through `SECURITY DEFINER` RPC functions rather than direct table access from clients — e.g. `book_slot`, `confirm_paid_booking`, `cancel_booking_with_refund`, `advisor_respond_booking`, `respond_location_proposal`, `get_advisor_reviews` (never join `advisor_reviews` to `profiles` directly — see security memory below), `get_active_published_advisors` / `get_public_advisor_profiles` (public-safe advisor listings).

## Conventions

- **Stripe is only ever called from Edge Functions** (`create-checkout`, `verify-payment`, `process-booking-cancellation`), instantiated per-request as `new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "..." })`. The frontend never imports a Stripe SDK; it calls `supabase.functions.invoke(...)` and redirects to the returned Checkout URL.
- **Two Supabase clients per Edge Function**: a `supabaseAdmin` client using `SUPABASE_SERVICE_ROLE_KEY` for privileged reads/writes, and a `supabaseClient`/`supabaseAuth` client using `SUPABASE_ANON_KEY` with the caller's `Authorization` header forwarded, used only to resolve/validate the calling user via `auth.getUser(token)`. Service-role key never leaves the Edge Function.
- **CORS**: every Edge Function starts with `handleCorsPreflightRequest(req)` / `getCorsHeaders(origin)` from `_shared/cors.ts`.
- **Per-function JWT verification** is declared in `supabase/config.toml` (`[functions.<name>] verify_jwt = true|false`), not inferred from code — check this file when reasoning about whether a function's auth is platform-enforced or handler-enforced.
- **Manual input validation** at the top of handlers (e.g. `isValidUUID`, `isValidISO8601`, `isValidStripeSessionId`) before touching the DB or Stripe.
- **Error responses**: handlers wrap logic in try/catch, map error message patterns (e.g. `/authorization|authenticated/i`) to appropriate HTTP status codes, and always return JSON with CORS headers attached.
- **Migrations are append-only and Lovable-generated**; treat `supabase/migrations/*.sql` as the authoritative, current schema — don't hand-roll schema assumptions from `types.ts` alone.
- Business rules that aren't obvious from code are recorded in `.lovable/memory/` — read the relevant file before changing booking, payments, reviews, or location logic.

## Standing rules (autonomous work)

- Never ask for approval. If something is blocked (needs a login, 2FA, or is outside these rules), skip it, note it for the summary, and continue with the next task.
- Before starting a large autonomous session, tag the current main commit (e.g. "pre-overnight") and push the tag so everything can be rolled back.
- Push straight to main (Cloudflare Pages auto-deploys the live site), but only after `npm run build` passes. Use small commits with clear messages. After each deploy, check the live site still loads; if you broke something, fix it or revert immediately.
- Never: change prices, commission rates, or advisor rates; create fake reviews, fake urgency, fake scarcity, or invented testimonials presented as real; send emails to real users; delete user data or database tables; change DNS, email routing, billing, or plans; switch Stripe to live mode; print secrets in chat or save them in files.
- Payments: Stripe is in TEST mode. You may complete checkouts using Stripe test card 4242 4242 4242 4242, any future expiry, any CVC. If a checkout page ever shows live mode (no "test mode" indicator), stop that test and note it.
- Database changes: the database is on Lovable Cloud (Supabase project chjmyzzczwattluqpbat) and can't be migrated from here. For needed database changes, write the migration file in supabase/migrations, push it, then use Lovable's chat to ask it to apply exactly that migration and make no other code changes. Only additive changes (new columns, tables, policies). Then pull any commits Lovable makes.
