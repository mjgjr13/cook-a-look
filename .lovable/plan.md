## What's happening

Your custom domain has a TLS/SSL problem — not a code problem. From my checks:

- DNS for both `cookalook.com` and `www.cookalook.com` correctly points to Lovable (`185.158.133.1`).
- `https://www.cookalook.com` currently returns **HTTP 200** from my server (the site itself is healthy and published).
- `https://cookalook.com` (the apex, no `www`) fails the TLS handshake immediately — **no SSL certificate has been issued for the apex**.
- Your browser is showing `ERR_SSL_PROTOCOL_ERROR` on `www.cookalook.com`, which usually means either a stale/cached cert in your browser, an HSTS entry forcing HTTPS against a host whose cert is still provisioning, or a Cloudflare edge that hasn't picked up the new cert yet.

Google most likely indexed `https://cookalook.com` (the apex), so search-result clicks land on the broken version, and HSTS then makes the `www` variant fail in the same browser session.

There are **no code changes that can fix this** — it lives in Project Settings → Domains and at your DNS/registrar. Here is the plan.

## Plan

### 1. Fix the apex domain in Lovable (you do this — I can't)
- Open **Project Settings → Project → Domains**.
- Find `cookalook.com` (without `www`). Expected outcomes:
  - **Not listed** → click **Connect Domain**, add `cookalook.com`, complete the flow.
  - **Status = Failed / Action required / Offline** → click **Retry** / **Complete Setup**.
  - **Status = Verifying / Setting up** → wait; SSL is still being issued.
- Confirm `www.cookalook.com` is also listed and **Active**. Set one of them as **Primary** (recommended: `www.cookalook.com`); the other will 301-redirect to it.

### 2. Clear the browser-side SSL/HSTS cache (you do this)
While certs finish provisioning, your own browser is poisoned:
- Chrome: open `chrome://net-internals/#hsts`, under "Delete domain security policies" enter `cookalook.com`, click Delete. Repeat for `www.cookalook.com`.
- Then quit and reopen Chrome and try `https://www.cookalook.com` again.
- Also test in an incognito window and on mobile data to rule out local caching.

### 3. Verify
Once both domains show **Active** in Lovable Domains and your browser cache is cleared, both of these should load:
- `https://cookalook.com` → redirects to www
- `https://www.cookalook.com` → loads the site

### 4. Help Google catch up (optional, after step 3 works)
- In Google Search Console, submit `https://www.cookalook.com/sitemap.xml` and request re-indexing of the homepage so Google replaces the broken apex URL in its index with the working canonical one.
- Your `index.html` and sitemap already use `https://www.cookalook.com` as the canonical, so once the apex redirects correctly, Google will consolidate naturally over time.

## What I will do in build mode
Nothing yet — this is an infrastructure/DNS issue, not a code issue. If after step 1 the apex still won't provision (status stuck on Failed for more than an hour), let me know and we can:
- Re-verify there are no conflicting A / AAAA / CAA records at your registrar that block Let's Encrypt.
- Contact Lovable support with the domain name and a screenshot of Domains + your registrar's DNS panel.

Approve this plan and then complete step 1 in Project Settings → Domains; ping me with the status it shows and I'll take it from there.