# Data retention & deletion schedule (PROPOSAL — REQUIRES PROFESSIONAL REVIEW)

"Current" describes what the system does today. "Proposed" needs your decision, legal and accounting review, and in most cases a scheduled job. Don't publish retention promises until the matching job exists.

| Data | Current | Proposed | How it would be enforced |
|---|---|---|---|
| Account (profile, login) | Until the user deletes it. Deletion now runs server-side (anonymize + disable login), pending deploy of `delete-account`. | Same; deletion completed within 30 days of a request | `delete-account` function; manual for email requests |
| Advisor ID + selfie documents | Kept. Deletion job exists but isn't scheduled. | Delete 30 days after the application decision (approved or denied) | Schedule `delete-expired-verifications` (E7) |
| AI Concierge questions (`concierge_logs`) and feedback (`concierge_feedback`) | Anonymised (no user id; emails/phone numbers scrubbed). 90 days. | Same | `purge_old_concierge_data()` daily via pg_cron, plus an occasional run from `advisor-chat` |
| AI Concierge memory (`concierge_profiles`) | Short style-preference note for signed-in users, until they clear it or delete their account | Same | Owner can clear it in Settings → Security; `delete-account` removes it (and it cascades if the login is deleted) |
| Advisor date of birth | Kept indefinitely | Keep while the application or advisor account exists; delete with the account | `delete-account` (rows deleted) |
| Advisor applications (denied) | Kept | Delete 12 months after denial | New scheduled job (to build) |
| Booking & payment records | Kept; anonymized on account deletion | Keep for the period required by tax law (**accountant to confirm**; often 6 years in Canada) | Keep rows; anonymize profile |
| Messages (`booking_messages`) | Kept indefinitely | Delete 24 months after the booking, unless a dispute is open | New scheduled job |
| Video recordings (Daily) | Terms say ≤90 days; setting unverified | 90 days, or longer only while a dispute is open | Daily retention setting (E5) |
| Reviews | Kept; author anonymized on deletion | Same | — |
| Waitlist emails | Kept indefinitely | Delete 12 months after collection, or after the launch email is sent | New scheduled job |
| Concierge chats | Not stored by Cook A Look (browser session only) | Same | — |
| Email logs / suppression list | Kept | Logs 12 months; keep the suppression list indefinitely (needed to honour opt-outs) | New scheduled job |
| Backups | **UNKNOWN** (Lovable Cloud) | Document provider retention; deleted data ages out of backups on that schedule | Ask Lovable/Supabase (E8) |
