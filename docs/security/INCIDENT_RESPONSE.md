# Security & privacy incident response plan (DRAFT — internal)

**Owner:** the founder (privacy and security contact). Keep this short and actually usable. Review it every 6 months.

## 1. What counts as an incident
- Unauthorized access to personal information (database, storage, email queue, admin account, Stripe, Daily, or Resend dashboards)
- Lost or exposed credentials (Stripe keys, service-role key, Resend key, admin passwords)
- Payment fraud, unusual refunds or payouts, or a webhook failure leaving paid bookings unconfirmed
- Malicious uploads, defacement, phishing sent from cookalook.com
- An account takeover reported by a user

## 2. First hour
1. **Contain.** Rotate the exposed key (Stripe → API keys; Lovable → Secrets; Resend → API keys). Suspend the affected account (Admin → Advisors → Suspend). If needed, revert to a known-good git tag (`git revert`, or redeploy a previous Cloudflare deployment).
2. **Preserve evidence.** Export the relevant logs: Supabase/Lovable function logs, Cloudflare, Stripe events, Daily. Note times and what you saw. Don't delete anything yet.
3. **Record** in an incident log: date/time found, who found it, systems and data involved, and actions taken.

## 3. Assess (within 72 hours)
- Which people and which data? (Use `AUDIT_REPORT.md` section 3 as the inventory.)
- Under PIPEDA, a breach of security safeguards involving personal information that creates a **real risk of significant harm** must be reported to the Office of the Privacy Commissioner of Canada and notified to affected individuals as soon as feasible. **All** breaches must be recorded and the records kept (PIPEDA breach regulations). Whether a given incident meets the threshold **REQUIRES PROFESSIONAL REVIEW**; contact a privacy lawyer.
- If Quebec, EU, or US residents are affected, other notification rules may apply. Ask the lawyer.

## 4. Notify (if required or appropriate)
- Office of the Privacy Commissioner of Canada: breach report form at priv.gc.ca.
- Affected users: what happened, what data, what you've done, what they should do (e.g. reset password), and a contact.
- Stripe or card brands, if payment data is involved (unlikely, since Cook A Look never handles cards).
- Vendors involved (Supabase/Lovable, Daily, Resend).

## 5. Recover & learn
- Fix the root cause. Add a check to `scripts/security-check.ts` if one fits.
- Update `AUDIT_REPORT.md` and this plan.
- Keep the incident record (PIPEDA requires breach records to be kept for 24 months).

## Contacts (fill in)
| Role | Name / contact |
|---|---|
| Privacy & security lead | |
| Privacy lawyer | |
| Accountant | |
| Lovable support | |
| Stripe support | dashboard.stripe.com/support |
