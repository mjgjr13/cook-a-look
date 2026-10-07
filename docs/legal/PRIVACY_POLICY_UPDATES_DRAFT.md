# Privacy Policy — required corrections and additions

> **DRAFT — requires review by a qualified privacy lawyer before publication.** The live Privacy Policy (`src/pages/PrivacyPolicy.tsx`) was **not** changed. Below: what the current policy gets wrong or misses compared with how the system actually works, then suggested text.

## Gaps found (2026-10-04)

1. **Governing law.** The policy references the CCPA but not **PIPEDA**, which most likely applies to an Ontario business. Add a Canadian framing: privacy officer contact, access and correction rights, the complaint route to the Office of the Privacy Commissioner of Canada.
2. **Missing processors** (see `docs/security/VENDOR_REGISTER.md`): the AI concierge (Anthropic Claude; previously Lovable AI Gateway / Google Gemini), Google Fonts, Google Maps Places, Cloudflare, Supabase/Lovable Cloud as host, ui-avatars.com, and the **meet.ffmuc.net fallback (Germany)**.
3. **New data:** advisor **date of birth** (18+ check), the waitlist (email, optional name and note), and concierge chat content.
4. **Cross-border transfers:** say plainly that data is processed outside Canada (mainly the US) by these providers.
5. **Retention:** only state periods that are actually enforced (see `RETENTION_SCHEDULE.md`). The current "90 days" for recordings depends on a Daily setting that hasn't been verified.
6. **Deletion:** describe what deletion really does once `delete-account` is deployed. Personal details, photos, and documents are removed and the login is disabled. Booking and payment records are kept without personal details, for accounting.
7. **Cookies and storage:** the site sets no tracking cookies. It uses browser storage for sign-in and the concierge conversation (see `COOKIES_AND_STORAGE_NOTICE_DRAFT.md`).
8. **Security wording:** avoid absolute claims ("never shared", "fully secure"). "Encrypted" is accurate for data in transit (HTTPS) and at rest at the provider level. Keep it factual.

## Suggested additions

### Who we are and how to contact us
Cook A Look is operated from Ontario, Canada. Our privacy contact is **[name], info@cookalook.com** *(consider a dedicated privacy@ address)*. If you're not satisfied with our response, you can complain to the Office of the Privacy Commissioner of Canada (priv.gc.ca).

### AI Style Concierge
When you use the Style Concierge, the messages you type are sent to our AI provider (Anthropic's Claude model) to generate replies. We don't link these messages to your account, and we don't store them on our servers. The conversation stays in your browser until you close the tab or start a new chat. Don't include sensitive information such as health or identity documents. *(Confirm the provider's retention and training terms before publishing.)*

### Advisor verification and age
Advisors give their date of birth to confirm they're 18 or older, and upload a government ID and a live selfie for identity review. These documents are stored in private storage that only you and our admin team can access, and we delete them after review *(publish this only once the deletion job is scheduled)*.

### Service providers and international transfers
We use service providers to run Cook A Look, including Supabase (hosting and database), Stripe (payments), Daily.co (video), Resend (email), Cloudflare (website delivery), Anthropic (the AI model), Google (fonts and maps), and, only if our main video provider fails, Freifunk München's Jitsi service in Germany. These providers may process your information outside Canada, including in the United States and Germany, where local laws may allow government access. We share only what each provider needs to perform its service.

### Your choices and rights
You can access, correct, or delete your information. Edit your profile in Account Settings, delete your account there, or email us. We'll respond within 30 days. You can withdraw consent to optional uses, such as waitlist emails, at any time.
