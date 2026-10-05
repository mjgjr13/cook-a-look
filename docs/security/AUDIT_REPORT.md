# Cook A Look — Security, Privacy & Compliance Audit (Stage 1)

**Date:** 2026-10-04 · **Branch:** `security-compliance-audit` · **Auditor:** Claude (AI), working from the repository, the live site, and read-only probes with the public key and one test client account.

> Nothing in this report is legal advice, and no statement here means Cook A Look is "secure" or "compliant". Items marked **REQUIRES PROFESSIONAL REVIEW** need a Canadian privacy/consumer lawyer, an accountant, or a security specialist.

Status labels: **VERIFIED** (tested and confirmed) · **IMPLEMENTED BUT UNVERIFIED** · **NOT IMPLEMENTED** · **NOT APPLICABLE** · **REQUIRES PROFESSIONAL REVIEW**.

---

## 1. Executive summary

The core access controls are in better shape than most early-stage marketplaces. Row Level Security is on for every table. A signed-in client can only read their own bookings, payments, and messages. Attempts to self-promote to advisor or admin are blocked. Stripe prices are calculated on the server, and payment confirmation checks that the Stripe session belongs to the caller. All of this was **VERIFIED** by direct API requests.

The audit did find **two critical issues that are live in production today**:

1. **SEC-01 (P0):** the email-queue database functions can be called by anyone on the internet, without signing in. An attacker could **read queued emails**, which can include password-reset and sign-in links (an account-takeover path). They could also **insert emails**, which the platform would then send from cookalook.com (phishing).
2. **SEC-02 (P0):** `redeem_site_credits` can be called by anyone. It can deduct any user's site credits.

The likely cause is the same for both. Earlier migrations revoked access from `PUBLIC` only, but Supabase grants the `anon` and `authenticated` roles execute rights directly. The fix is a short migration (`20261004010000…`) that is written but **not applied**, waiting for your approval.

Other high-priority gaps: account deletion doesn't actually delete the account (SEC-05), two stored-XSS paths into the admin panel (SEC-03), no security headers such as CSP, HSTS, or clickjacking protection (SEC-04), the unpublished cancellation policy (LEG-02), the Stripe webhook secret not configured (PAY-01), and booking emails failing because the email domain is unverified (OPS-01).

---

## 2. Architecture (as observed)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite SPA, Tailwind/shadcn | Hosted on **Cloudflare Pages**; auto-deploys from `main` |
| Backend | **Supabase on Lovable Cloud** (project `chjmyzzczwattluqpbat`) | Postgres + RLS, Auth, Storage, Deno Edge Functions. The hosting region isn't visible from here (**UNKNOWN**). |
| Payments | **Stripe** Checkout (test mode), refunds via Edge Functions | No Stripe Connect. Advisor payouts are withdrawal requests handled by an admin. |
| Video | **Daily.co** rooms (cloud recording on) with automatic fallback to **meet.ffmuc.net** (Jitsi, Germany) | Rooms are `privacy: public`, and anyone with the URL can join. |
| Email | **Resend**, plus a Postgres queue (`pgmq`) processed by `process-email-queue` | Sending domain is unverified (OPS-01). |
| AI | **Style Concierge** → Lovable AI Gateway → **Google Gemini** (`gemini-3-flash-preview`) | Public, no login. Rate-limited per IP per instance. |
| Maps | Google Maps Places (browser key) | Used for in-person location suggestions |
| Fonts | Google Fonts (fonts.googleapis.com / gstatic.com) | Loaded on every page |
| Analytics / trackers | **None found** (no GA, pixels, or session replay). No cookies are set on the homepage. | **VERIFIED** 2026-10-04 |

Edge Functions without platform JWT verification (`verify_jwt = false`): `create-checkout`, `stripe-webhook`, `create-video-room`, `send-signup-confirmation`, `submit-advisor-application`, `advisor-chat`. Each one checks the caller in code, except `stripe-webhook` (verified by Stripe signature) and `advisor-chat` (public by design).

---

## 3. Personal-data inventory

| Data | Where stored | Purpose | Shared with | Retention today |
|---|---|---|---|---|
| Name, email, password hash | Supabase Auth, `profiles` | Accounts, login, notices | Supabase, Resend (email) | Indefinite. Deletion doesn't remove the auth user (SEC-05). |
| Phone (advisors) | `profiles`, `advisor_applications` | Advisor contact | — | Indefinite |
| Date of birth (advisors) | `advisor_applications.date_of_birth` | 18+ eligibility | — | Indefinite. **Define a retention period.** |
| Government ID + selfie (advisors) | Storage `verifications` (private), signed URLs in `advisor_applications` | Identity verification | Supabase | `delete-expired-verifications` exists, **but its daily schedule isn't active** (needs the vault key; see Lovable's note) |
| Profile photo, portfolio images, bio, location, Instagram | Storage `avatars`/`portfolios` (public), `profiles` | Public advisor profiles | Public internet | Indefinite |
| Bookings, times, meeting type, in-person venue | `bookings`, `availability_slots`, `advisor_meeting_locations` | Service delivery | Advisor/client counterpart | Indefinite (needed for accounting) |
| Messages | `booking_messages` | Client–advisor chat | Participants, admins | Indefinite |
| Video recordings | **Daily.co cloud storage** | Disputes/quality (per the Terms) | Daily.co | Terms say "up to 90 days". **Daily retention setting not verified.** |
| Payment records (no card data) | `payments`, `refund_events`, Stripe | Payments, refunds, accounting | Stripe | Indefinite (accounting needs ~6+ years; **REQUIRES PROFESSIONAL REVIEW**) |
| Billing address, card | **Stripe only** | Payment, tax | Stripe | Stripe's policy. Cook A Look never sees card numbers (**VERIFIED**: Checkout is a redirect). |
| Reviews, ratings | `advisor_reviews` | Social proof | Public (via RPC) | Indefinite |
| Rewards, referrals, credits | `user_rewards`, `point_transactions`, `referrals`, `site_credits_log` | Loyalty | — | Indefinite |
| Waitlist emails (+ optional name/note) | `booking_waitlist` | Launch notification | — | Indefinite. **Define a period** (e.g. delete 12 months after launch). |
| Concierge chat text | **Not stored by Cook A Look.** Kept in the visitor's browser session only. Sent to Lovable AI Gateway → Google. | Style advice | Lovable, Google | Provider retention **UNKNOWN** (check Lovable AI Gateway terms) |
| Email delivery logs | `email_send_log`, `suppressed_emails`, unsubscribe tokens | Deliverability, opt-outs | Resend | Indefinite |
| IP address / request metadata | Cloudflare, Supabase, Google Fonts, Daily, Lovable AI logs | Hosting, security | Those vendors | Vendor-defined |

A data-flow map and full vendor register are in `docs/security/VENDOR_REGISTER.md`.

---

## 4. Findings

### P0 — fix immediately

| ID | Finding | Evidence | Status | Fix |
|---|---|---|---|---|
| **SEC-01** | `enqueue_email`, `read_email_batch`, `delete_email`, and `move_to_dlq` are executable by `anon`. Anyone can read queued emails (which may hold auth links) and send email via the platform. | Anonymous RPC to a throw-away queue name returned a message id, then read it back, 2026-10-04. Real queues were deliberately **not** read. My test message was deleted. The empty test queue is dropped by the fix migration. | **VERIFIED** (vulnerable) | Migration `20261004010000` revokes from `PUBLIC, anon, authenticated`. `process-email-queue` uses the service role, so it is unaffected. **Not applied. Needs your approval.** |
| **SEC-02** | `redeem_site_credits(_user_id, _amount_cents)` is executable by `anon` and `authenticated`, for **any** user id. | Anonymous and client calls returned `0` (executed) instead of "permission denied" | **VERIFIED** (vulnerable) | Same migration. No frontend code calls it. |

### P1 — before launch

| ID | Finding | Evidence | Status | Fix on branch |
|---|---|---|---|---|
| **SEC-03** | Stored XSS into the admin panel: applicant-controlled `portfolio` / `portfolio_url` is used as a link `href` without checking the scheme (a `javascript:` URL runs when an admin clicks it). | `AdminAdvisors.tsx:993`, `AdvisorDetailModal.tsx:350` | Confirmed by code review | `safeExternalUrl()` helper. Only `http(s)` links are rendered. |
| **SEC-04** | Missing security headers: no CSP, HSTS, X-Frame-Options/frame-ancestors (clickjacking), or Permissions-Policy. | Live response headers, 2026-10-04 | **VERIFIED** (missing) | `public/_headers` adds HSTS, frame-ancestors, a permissions policy, and nosniff. CSP ships in **Report-Only** first, to test against Stripe, Daily, and Maps before enforcing. |
| **SEC-05** | "Delete account" runs in the browser, ignores errors, **doesn't delete the login**, and leaves phone, messages, photos, and **ID/selfie documents**. It **fails entirely for advisors** (the privilege trigger blocks the update), and deletes past bookings that are needed for records. | `AccountSettings.tsx:49–112`. Trigger `prevent_profile_privilege_escalation`. | Confirmed by code review | New server-side `delete-account` Edge Function: anonymizes the profile, removes storage files and waitlist entries, cancels future bookings through the normal refund path, keeps payment/booking records for accounting, and deletes the auth user. **Needs a Lovable deploy.** |
| **PAY-01** | `STRIPE_WEBHOOK_SECRET` isn't configured, so the webhook backstop never confirms bookings. A client who pays and closes the tab is charged with no booking. | Fake-signature probe returned "Missing signature or secret". A paid booking stayed `pending` for hours. | **VERIFIED** | External: Stripe dashboard + Lovable secret (section 6) |
| **OPS-01** | Booking confirmation emails fail: cookalook.com isn't a verified Resend sending domain. | Lovable issue report, 2026-10-04 | Reported by Lovable | External: DNS records (section 6) |
| **LEG-02** | The cancellation/refund policy isn't disclosed before purchase. The Terms refer to a "policy in effect" that isn't published. The real rules live only in `calculate_refund`. | Code vs Terms | Confirmed | Booking summary now states the actual rules before payment (factual, taken from code). A draft policy is in `docs/legal/`. |
| **PRIV-01** | The Privacy Policy omits several real processors and flows: the AI concierge (Lovable/Google), Google Fonts & Maps, Cloudflare, the Jitsi/ffmuc fallback, and the date-of-birth field. It mentions CCPA but not **PIPEDA**, the law most likely to apply to an Ontario business. | `PrivacyPolicy.tsx` | Confirmed | Draft updates in `docs/legal/` (**REQUIRES PROFESSIONAL REVIEW**). The live page was not changed. |
| **SEC-06** | No MFA for administrators. | No TOTP/AAL2 checks in code | NOT IMPLEMENTED | Recommended next stage: Supabase TOTP enrolment + AAL2 required in `AdminRoute` **and** in admin RLS policies |

### P2 — near term

| ID | Finding | Status | Fix |
|---|---|---|---|
| SEC-07 | Storage buckets don't restrict file types. Only one has a size limit. Users could upload HTML/SVG to public buckets and host phishing pages under the storage domain. | Confirmed (migrations) | Migration sets `allowed_mime_types` (jpeg/png/webp/heic) and size limits. **Not applied.** |
| SEC-08 | `send-signup-confirmation` never checks that the user it finds matches the requested email (`listUsers` ignores the email filter). The anti-abuse check is unreliable, and welcome emails may silently never send. | Code review | Fixed to look up and compare the exact address |
| SEC-09 | `get_all_advisor_profiles_including_demo` is callable by `anon` and returns unapproved applicants' profiles (name, bio, photo). | **VERIFIED** (7 rows anonymously) | Revoked in the P0 migration (unused by the app) |
| VID-01 | Daily rooms are `public` (the URL alone grants entry). The fallback Jitsi room on a public German community server uses a predictable name. | Code review | Next stage: private rooms + short-lived meeting tokens. Reconsider the Jitsi fallback, or disclose it. |
| VID-02 | Recording retention ("up to 90 days" in the Terms) isn't verified in Daily's settings. | Unverified | External: check Daily retention |
| AI-01 | The concierge has no explicit handling for self-harm or urgent-safety disclosures, or for requests to share personal data. | Code review | System prompt updated |
| DEP-01 | 17 npm advisories (15 high). Almost all are build tooling. React Router's advisory affects SSR "framework mode", which this SPA doesn't use. | `npm audit` | Non-breaking `npm audit fix` applied on branch |
| RET-01 | No retention periods defined for DOB, waitlist, messages, applications, or logs. The verification-photo deletion job isn't scheduled. | Confirmed | `docs/security/RETENTION_SCHEDULE.md` (proposal) |

### P3 — hardening

| ID | Finding |
|---|---|
| SEC-10 | The public `avatars` bucket allows anonymous **listing**, which reveals user UUIDs. Restrict listing; public file URLs keep working. |
| SEC-11 | Sign-up says "An account with this email already exists" (account enumeration; low impact, common trade-off). |
| SEC-12 | A `.env` file was committed in history (2026-01 to 2026-06). It contained only **public** values (project id, publishable key). No secret exposure, but keep `.env` ignored. |
| SEC-13 | Lovable's database checkup reports 56 pre-existing warnings (extensions in `public`, security-definer functions callable by users). Several overlap SEC-01/02/09. The rest need review. |
| OPS-02 | Lovable's own preview builds show "Build unsuccessful" for GitHub pushes (Cloudflare builds fine). Investigate, so Lovable stays usable. |

---

## 5. What was VERIFIED as working

- RLS enabled on all 33 tables created by migrations. Anonymous reads return no private rows. Only public meeting venues and old lookbook content are readable.
- A signed-in client sees only its own `bookings`, `payments`, `video_sessions`, `booking_messages`, and `refund_events`. Other users' email and phone columns aren't selectable.
- Privilege escalation blocked: the client's `PATCH profiles {advisor_approved, is_advisor, verified}` failed with "Cannot modify privileged profile fields", and `INSERT user_roles {role: admin}` failed RLS.
- Financial RPCs (`confirm_paid_booking`, `mark_refund_result`, `cancel_booking`, `calculate_refund`, `complete_due_bookings`, `award_client_points`) are denied to `anon`.
- Stripe prices are computed server-side from the database. `verify-payment` rejects sessions belonging to another user. Refund percentages are computed in the database. Test-mode sessions (`cs_test_…`) confirmed.
- Booking slots are locked with `FOR UPDATE` against double booking. The video-room function rejects unpaid, cancelled, and in-person bookings, and non-participants.
- Storage writes are limited to the owner's own folder. The `verifications` bucket is private.
- No trackers, analytics, or session replay. No cookies on the public site.

---

## 6. External configuration required (cannot be done from the repo)

| # | Where | Action | Verify |
|---|---|---|---|
| E1 | **Lovable chat** | Apply `20261004010000_…` (P0 revokes) and `20261004020000_…` (storage limits). Deploy `delete-account`, `send-signup-confirmation`, `advisor-chat`. | Anonymous `rpc/read_email_batch` returns `42501 permission denied` |
| E2 | **Stripe** (test, then live) | Developers → Webhooks → endpoint `https://chjmyzzczwattluqpbat.supabase.co/functions/v1/stripe-webhook`, event `checkout.session.completed`. Copy the `whsec_…` into a Lovable secret `STRIPE_WEBHOOK_SECRET`. | A fake-signature probe returns "Invalid signature" instead of "Missing signature or secret" |
| E3 | **Resend + Cloudflare DNS** | Resend → Domains → add cookalook.com. Add the SPF/DKIM records it shows in Cloudflare DNS. Add a DMARC record (`v=DMARC1; p=none; rua=mailto:…` to start). | Resend shows "Verified". A test booking email arrives. |
| E4 | **Supabase Auth** (via Lovable) | Turn on leaked-password protection, if offered. Confirm email-confirmation and rate-limit settings. Enable MFA (TOTP). | Settings screen |
| E5 | **Daily.co** | Confirm the recording retention matches the Terms (90 days). Plan the switch to private rooms + tokens. | Daily dashboard |
| E6 | **Google Cloud** | Restrict the Maps browser key to HTTP referrers `www.cookalook.com/*`, `cookalook.com/*` and to the Places API only. | Key restrictions page |
| E7 | **Vault + cron** | Schedule `delete-expired-verifications` (steps in migration `20260704010000`). | `cron.job` lists it |
| E8 | **Backups** | Confirm which backups or point-in-time recovery Lovable Cloud provides, and test one restore. | Written record |
| E9 | **Legal / tax** | Lawyer review of the drafts in `docs/legal/`. Accountant review of GST/HST on platform fees, marketplace facilitator rules, and payout records. | — |

---

## 7. Law applicability (initial view — REQUIRES PROFESSIONAL REVIEW)

| Law | Likely applies? | Why / notes |
|---|---|---|
| **PIPEDA** (Canada) | **Likely yes** | Private-sector organization collecting personal information in commercial activity. Drives consent, purpose, safeguards, access/correction rights, breach records and reporting of breaches posing a "real risk of significant harm". |
| Ontario privacy law | Generally covered by PIPEDA for private businesses | Ontario has no general private-sector privacy statute. Lawyer to confirm. |
| **Quebec Law 25** | Only if serving Quebec residents | If yes, adds privacy-officer, privacy-impact-assessment, and stricter consent requirements. |
| **CASL** | **Yes**, for commercial electronic messages | The waitlist email is consent-based. Marketing needs express or implied consent, identification, and a working unsubscribe. Transactional booking emails are generally exempt from the consent rules. |
| Ontario Consumer Protection Act | Likely, for Ontario consumers | Clear pre-purchase disclosure of total price and cancellation terms (see LEG-02). |
| Competition Act (reviews/claims) | Yes | Genuine reviews and no misleading claims. Sample profiles are already labeled. |
| CCPA/CPRA | **Probably not yet** | Revenue/volume thresholds are unlikely to be met at launch. Re-check if US volume grows. |
| GDPR / UK GDPR | Only if targeting EU/UK users | Not targeting today. The Jitsi fallback sends call data to Germany. Disclose it. |
| COPPA | Not applicable | Not directed at children. Advisors are 18+ (enforced). Clients: the Terms say 18+, but sign-up has no age gate. **Decide.** |
| PCI DSS | Reduced scope (SAQ A likely) | Stripe-hosted Checkout. Cook A Look never handles card data. |

No penalties or deadlines are stated here, because none were verified. The ChatGPT prompt's warnings (fixed per-user fines, automatic Google Fonts fines, and so on) are treated as unverified.

---

## 8. Recommendations beyond the original prompt

1. **Fix SEC-01/02 today.** They're the only issues where a stranger can act right now.
2. **Remove the test advisor before launch** (`TEST_ADVISOR_ACTS_AS_REAL=false`), and remove or relabel the remaining sample profiles. Also confirm you have rights to their photos (they look like fashion-campaign images).
3. **Advisor payout records:** withdrawals are paid manually by an admin. Keep an audit trail (who approved, when, amount, method), and reconcile against Stripe monthly.
4. **In-person safety:** publish safety guidance and add a "report a problem" path from each booking. Don't imply background checks. Today's verification is an ID + selfie review only.
5. **AI concierge:** add a "report this answer" link, and keep the "AI, not a human stylist" notice.
6. **Admin hygiene:** list who holds the admin role (currently at least the founder's account), and remove any test accounts holding roles.
7. **Video privacy:** move to Daily private rooms with tokens, and decide whether a public Jitsi fallback is acceptable.

---

## 9. Continuation checklist

See `docs/security/CHECKLIST.md`. It's kept up to date as items move between statuses.
