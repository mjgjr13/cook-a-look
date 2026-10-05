# Third-party vendor & data-processing register (DRAFT)

Last reviewed: 2026-10-04. Items marked **UNKNOWN** need checking in the vendor's dashboard or contract. Cross-border: Cook A Look is based in Ontario, Canada, and most vendors process data in the US or globally. Disclose this in the Privacy Policy (PIPEDA allows transfers, with comparable protection and transparency; **REQUIRES PROFESSIONAL REVIEW**).

| Vendor | Role | Personal data it receives | Location | Contract / DPA | Retention | Notes |
|---|---|---|---|---|---|---|
| **Supabase via Lovable Cloud** | Database, auth, file storage, edge functions | Everything in the app database and storage (accounts, profiles, bookings, messages, ID documents) | Region **UNKNOWN** (check Lovable Cloud) | Lovable terms; Supabase DPA via Lovable **UNKNOWN** | Until deleted; backups **UNKNOWN** | Primary system of record |
| **Lovable** | Development platform; hosts the AI gateway | Code; concierge chat text (via AI Gateway) | US (assumed) | Lovable terms | AI request logs **UNKNOWN** | Has admin-level access to the project |
| **Google (Gemini via Lovable AI Gateway)** | AI model for the Style Concierge | Visitor chat messages; public advisor profile data | US/global | Via Lovable | **UNKNOWN**; check whether prompts are used for training | No account data is sent. Visitors are told it's AI. |
| **Stripe** | Payments, refunds, tax calculation | Name, email, billing address, card (Stripe only), amounts, booking metadata (ids) | US/global | Stripe Services Agreement + DPA (standard) | Stripe policy | Cook A Look never sees card numbers |
| **Daily.co** | Video calls + cloud recording | Video/audio of sessions, participant names, IP | US | Daily terms/DPA **UNKNOWN** | Recordings: Terms promise ≤90 days; setting **UNKNOWN** | Rooms are public-by-URL (VID-01) |
| **meet.ffmuc.net (Freifunk München, Jitsi)** | Fallback video if Daily fails | Video/audio, IP | Germany | **None**: community service | **UNKNOWN** | Recommend removing or disclosing (VID-01) |
| **Resend** | Transactional email | Recipient email, name, email content (booking details, links) | US | Resend terms/DPA **UNKNOWN** | Resend logs | Domain unverified (OPS-01) |
| **Cloudflare (Pages, DNS)** | Website hosting/CDN, DNS | Visitor IP, request metadata | Global | Cloudflare terms | Logs per plan | Security headers set via `public/_headers` |
| **Google Fonts** | Web fonts | Visitor IP, user agent (on each page load) | US/global | Google terms | Google policy | Could self-host to remove this transfer (P3) |
| **Google Maps Platform (Places)** | Venue search for in-person sessions | Typed search text, IP | US/global | Google Maps terms | Google policy | Restrict the API key (E6) |
| **ui-avatars.com** | Placeholder avatar images | Advisor name (in image URL), IP | **UNKNOWN** | None | **UNKNOWN** | Used only when an advisor has no photo. Consider local initials instead (P3). |
| **purecatamphetamine.github.io** (GitHub Pages) | Country-flag images in the phone-number field (`react-phone-number-input`) | Visitor IP (when the phone field is shown) | US | None | — | Self-host the flag images to remove this request (P3) |
| **GitHub** | Source code hosting | No customer data (repo has no secrets) | US | GitHub terms | — | Keep `.env` out of git |
| **Google Search Console** | SEO | No customer data | — | — | — | — |

## Data flows (summary)

```
Visitor browser ──HTTPS──> Cloudflare Pages (static site)
       │
       ├──> Google Fonts (IP)          ├──> Google Maps Places (search text)
       ├──> Supabase (auth, data, storage, edge functions)
       │        ├──> Stripe (checkout session, refunds)  <── Stripe webhook
       │        ├──> Daily.co (create room)  [fallback: meet.ffmuc.net]
       │        ├──> Resend (emails)
       │        └──> Lovable AI Gateway → Google Gemini (concierge messages)
       └──> Stripe Checkout (redirect; card data entered at Stripe only)
```
