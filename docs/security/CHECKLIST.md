# Security & compliance checklist (persistent)

Keep this file current. Statuses: VERIFIED · IMPLEMENTED BUT UNVERIFIED · NOT IMPLEMENTED · NOT APPLICABLE · REQUIRES PROFESSIONAL REVIEW.
Branch: `security-compliance-audit` (not merged to `main`; nothing deployed to production yet).

## Stage 1 — done on this branch (2026-10-04)

| Item | Status | Where |
|---|---|---|
| Architecture, data inventory, vendor register, data-flow map | IMPLEMENTED BUT UNVERIFIED (has UNKNOWNs) | `AUDIT_REPORT.md`, `VENDOR_REGISTER.md` |
| SEC-01/02/09: revoke public access to the email queue, credit redemption, and the unapproved-profiles RPC | **IMPLEMENTED BUT UNVERIFIED — awaiting approval to apply** | `supabase/migrations/20261004010000_…` |
| SEC-07: storage MIME/size limits | IMPLEMENTED BUT UNVERIFIED — awaiting approval | `supabase/migrations/20261004020000_…` |
| SEC-03: admin stored-XSS links | IMPLEMENTED (unit-tested) | `src/lib/safeUrl.ts`, admin pages |
| SEC-04: security headers (CSP Report-Only) | IMPLEMENTED BUT UNVERIFIED (check on preview) | `public/_headers` |
| SEC-05: server-side account deletion | IMPLEMENTED BUT UNVERIFIED — needs Lovable deploy of `delete-account` | `supabase/functions/delete-account`, `AccountSettings.tsx` |
| SEC-08: signup email sent only to the exact matching new account | IMPLEMENTED BUT UNVERIFIED — needs deploy | `send-signup-confirmation` |
| AI-01: concierge safety rules (crisis, sensitive data, injection) | IMPLEMENTED BUT UNVERIFIED — needs deploy | `advisor-chat` |
| LEG-02: cancellation policy shown before payment | IMPLEMENTED (matches `calculate_refund`) | `BookingCalendar.tsx` |
| DEP-01: dependency updates (17 → 5 advisories; remainder are Tailwind 3 build-time only) | IMPLEMENTED | `package-lock.json` |
| Security regression script | IMPLEMENTED; currently fails exactly on SEC-01/02/09 | `npm run test:security` |
| Drafts: refund policy, privacy-policy corrections, AI disclosure, cookie notice, safety guidance, IP complaints, AUP | REQUIRES PROFESSIONAL REVIEW | `docs/legal/` |
| Retention schedule, incident response plan | REQUIRES PROFESSIONAL REVIEW | `docs/security/` |

## Stage 2 — 2026-10-05

| Item | Status |
|---|---|
| SEC-01/02/09 revokes applied in production | **VERIFIED** (`npm run test:security`: all pass) |
| SEC-07: storage uploads limited to jpg/png/webp via storage policies (bucket MIME settings not available on Lovable Cloud) + size limits | **VERIFIED** (HTML, disguised HTML and SVG refused; JPEG accepted) |
| Fonts self-hosted (no Google Fonts requests); phone flags bundled; ui-avatars removed | IMPLEMENTED |
| VID-01 private Daily rooms + per-person meeting tokens; emails link to dashboard | IMPLEMENTED BUT UNVERIFIED (needs deploy of create-video-room, send-booking-confirmation) |
| VID-03: sessions are now recorded automatically (meeting tokens start cloud recording); the booking's client and admins can watch them; others get 403 | **VERIFIED** 2026-10-05 (39-second test recording) |
| Advisor photo uploads: 2400px JPEG cap, 25MB originals accepted | IMPLEMENTED |

## Next — continuation point

1. **Approval needed:** apply migrations `20261004010000` + `20261004020000` and deploy `delete-account`, `send-signup-confirmation`, `advisor-chat` via Lovable. Then run `npm run test:security` (expect all PASS) and test deletion with a throw-away account.
2. Merge the branch to `main` once the CSP report-only console is clean on the key flows. Then switch CSP to enforcing.
3. External items E1–E9 in `AUDIT_REPORT.md` section 6 (webhook secret and Resend domain first).
4. SEC-06: admin MFA (Supabase TOTP enrolment + AAL2 in `AdminRoute` **and** in admin RLS policies).
5. VID-01: Daily private rooms + meeting tokens. Decide on the Jitsi fallback.
6. Remaining legal drafts: full Terms of Service rewrite, Advisor Agreement (flag contractor classification), marketing consent and unsubscribe procedures (CASL), consent records and policy-version tracking at sign-up.
7. Scheduled retention jobs (messages, waitlist, denied applications, email logs).
8. Review Lovable's 56 database warnings (SEC-13). Restrict avatar listing (SEC-10).
9. Accessibility pass (WCAG 2.2 AA) on booking, checkout, cancellation, video controls.
10. Financial: an audit trail for admin withdrawal approvals, monthly Stripe reconciliation, and referral/self-referral abuse checks.
