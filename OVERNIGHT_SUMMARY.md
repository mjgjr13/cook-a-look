# Overnight summary: Cook A Look launch prep (Oct 3, 2026)

Short version: the live site works end to end. A visitor can browse, sign up, pay (in Stripe test mode), see the booking, message the advisor, and cancel with an automatic refund. I fixed 10 real bugs along the way, made the first page load much faster, and replaced the fake "Test" advisors with clearly labeled sample profiles that can't take payment.

**Your Chrome sessions were out of reach.** Chrome blocks remote control unless a setting is switched on, and I didn't change your browser's security settings. That made all the Lovable, Google Cloud, Search Console, and GitHub-settings steps impossible from here. Each one is listed below with exact steps. The most important is the **Lovable step in section 3A**, which takes about 2 minutes.

---

## 1. What's working now (tested on the live site, desktop and phone width)

| Area | Result |
|---|---|
| All public pages (home, advisors, profiles, lookbook, become an advisor, sign in/up, password reset, terms, privacy) | Load with no errors, no broken images, no sideways scrolling on phones, no placeholder text |
| Sign up with email | Works. Bad input shows clear messages |
| Sign in / wrong password / sign out | Works. Wrong password says "The email or password you entered is incorrect" |
| Logged-out visitor opens the dashboard | Correctly sent to sign in |
| **Video session checkout** | Paid $600 with test card 4242… → Stripe showed **test mode** → "Booking Confirmed" page → booking in dashboard |
| **In-person session checkout** | Paid $635 ($600 + $35 in-person fee, matching the profile) → confirmed → in dashboard |
| Chat with advisor | Message sent and shown instantly |
| Cancel booking | Cancelled → **refund of $600 issued automatically in Stripe** |
| Mobile menu, footer links, nav links | All work. No dead links left |
| Sitemap / robots.txt | Uses www.cookalook.com and lists every public page |

Not testable tonight: Google sign-in (needs setup, see 3B) and leaving a review (only possible after a session is completed).

---

## 2. What I changed, and why it helps

### Honesty and trust (the most important fixes)
- **Fake ratings removed.** Every advisor showed "★ 5.0 (22–27 reviews)", but there were no reviews behind those numbers. Now a rating shows only when real reviews exist; otherwise it says "New advisor".
- **Sample advisors.** "Johnny Test", "Jane Test", "Alice Test", and "Chris Test" are now James Whitaker, Maya Ellison, Diane Holloway, and Marcus Reed. Each has a professional bio and specialties. Every card and profile carries a small **"Sample profile"** label, shows no rating and no "Verified" badge, and is hidden from Google.
- **Booking a sample advisor no longer charges money.** It opens a friendly "We're onboarding our first advisors, join the waitlist" form instead. (Before tonight, a visitor could pay $600 to "Johnny Test".) Checkout also refuses sample advisors on the server side, once Lovable deploys it (see 3A).
- **"Verified" claims are now accurate.** "Identity-verified advisor" only appears for advisors who are actually verified.
- **Admin controls.** Admin → Advisors → Active now has a **"Remove all sample advisors"** button (with an "are you sure?" step) and a **Remove** button on each sample. Removing hides them from the site. Nothing is deleted, so it can be undone.

### Easier booking (conversion)
- **Your chosen time is kept when you create an account.** Before, a new visitor who picked a time, clicked "Sign in to Book", and then created an account landed on an empty dashboard and lost their booking. Now "Continue to Book" goes to a short sign-up page that says "Your selected time is saved" and returns them straight to checkout.
- **Clearer profile pages.** A "How a session works" box (pick a time → pay securely → confirmation and chat → join the call) and a "Book a Session" button. The protection list (escrow, refunds, recordings) now also shows on phones, where it was hidden before. The in-person fee appears next to the price.
- **No surprises at checkout.** The booking summary shows the total on the button and notes that any sales tax is shown before paying.
- **Homepage.** More specific headline copy and a trust line under the buttons: "Video or in-person sessions · Secure checkout with Stripe · Payment protected until after your session". All three are true per your Terms.
- **Advisor sign-up.** The "Continue" button used to stay greyed out without saying why. It now tells applicants exactly what's missing.
- **Names with accents** (José, Zoë) were rejected at sign-up. They're accepted now.

### Bugs fixed
- The client dashboard showed "Session with" and then nothing (the advisor's name was missing). Fixed.
- The confirmation page told in-person clients to "join the video call". It now gives in-person instructions.
- After a cancellation, clients were told "Refund is pending review" even though the refund had gone through. Two causes: a failed notification email made the whole step look like it failed, and the message didn't check the refund status. Both are fixed.
- The "Read our full terms" link on every profile went to a 404 page. Fixed.
- Password reset showed a raw technical error when rate-limited. It now says "Please try again in a few minutes".
- The 404 page was a bare white page. It's now on-brand, with links back to advisors and home.

### Speed
- First-visit download is **36% smaller** (1.6 MB → 1.0 MB of code). Dashboards and admin pages now load only when someone opens them.
- Advisor photos were full-size uploads, up to **2.4 MB each** (about 4 MB for the four cards). They're now about **15–40 KB each**, with no visible quality loss.

### SEO
- Every page had the same Google description. Each page now has its own.
- Social share links now use www.cookalook.com.
- Password-reset, booking-confirmation, 404, and sample-profile pages are hidden from Google. The utility pages were also removed from the sitemap.
- A Privacy Policy link was added to the footer.

### Infrastructure (Phase 1, step 1)
- The build uses `npx tsx` (tsx added), and lovable-tagger was removed.
- All email links in the backend point to https://www.cookalook.com. The CORS allow-list puts www.cookalook.com first and drops the old lovable.app addresses.
- Stripe's "return to site" links can only point at your own domains.
- **The Google sign-in button is rewritten** to work directly with Supabase. It stays hidden until Google is set up (see 3B), then turns on with a one-line change.

---

## 3. What needs you (blocked, with exact steps)

### A. Lovable: apply the database migration and deploy backend changes (most important)
Right now the **waitlist form can't save emails**. It politely asks people to email info@cookalook.com instead. The **backend fixes also aren't live** until Lovable deploys them.

1. Open your Cook A Look project in Lovable and click **Sync from GitHub** if it isn't already synced.
2. Paste this into Lovable's chat:

   > Please apply exactly the migration file `supabase/migrations/20261003000000_7c1e4b2a-9d3f-4e8a-b5c6-1a2f3e4d5c6b.sql` to the database, then redeploy all edge functions from the current code. Make no other code changes.

   This migration only **adds** things. It creates a `booking_waitlist` table, marks the four sample advisors as `is_demo` with their new names and bios (prices unchanged), and recalculates ratings from real reviews. It already includes the July 3 review-count fix. The other two July 3 migrations are already applied ("Los Angeles" is fixed, and the role values exist).
3. **To check it worked:** open any sample profile → Join the Waitlist → enter your email. You should see "You're on the list!".

### B. Google sign-in
1. Lovable → Cloud → Users → Auth → Google → **Your own credentials**: copy the callback URL shown there.
2. Google Cloud Console → your Cook A Look project → **APIs & Services → OAuth consent screen**: External, app name "Cook A Look", support email admin@cookalook.com, authorized domain `cookalook.com`.
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://www.cookalook.com` and `https://cookalook.com`
   - Authorized redirect URI: the callback URL from step 1
4. Paste the client ID and secret into Lovable under "Your own credentials" and save. In Lovable's auth settings, set **Site URL** to `https://www.cookalook.com`.
5. Ask me (or Lovable) to set `GOOGLE_SIGN_IN_ENABLED = true` in `src/lib/featureFlags.ts`. The button and the "or" divider will appear on sign-in and sign-up.

### C. Other dashboard tasks I couldn't reach
- **GitHub, remove Vercel:** github.com → Settings → Applications → Installed GitHub Apps → Vercel → Configure → Repository access → remove `cook-a-look` only. (Vercel is still posting a status on every commit.)
- **Lovable Domains:** Project settings → Domains → remove `cookalook.com` and `www.cookalook.com`. Skip it if Lovable warns this will change DNS.
- **Google Search Console:** URL Inspection → request indexing for `https://www.cookalook.com/` and `https://www.cookalook.com/advisors`. Under Sitemaps, submit `sitemap.xml` if it isn't listed. The sitemap itself is correct.

### D. Things to check yourself
- **Sample advisor photos.** They look like professional fashion-campaign images. Before launch, make sure you have the right to use them, or swap them for licensed stock photos or real advisor photos.
- **Auth email limits.** My password-reset test was rate-limited after a few test emails. Lovable Cloud's default sender has low hourly limits. Before launch, ask Lovable to send auth emails through your Resend account (custom SMTP) so real customers don't hit the limit.
- **Test data I created** (all Stripe test mode, no real money). The test client is `marceljeangillesjr+cal-overnight1@gmail.com` (use "Forgot password" to get in). It has one confirmed in-person test booking with James Whitaker on Oct 7, one cancelled-and-refunded test booking, and one unpaid pending booking from a timed-out attempt. You'll also have received confirmation emails to that address, and the sample advisor account may have received booking/cancellation emails.
- **Your local folder `~/cook-a-look`.** It has uncommitted work of yours (privacy policy, terms, biometric consent screen, two new migrations). I did not touch it. All my work was done in a separate copy (`~/cook-a-look-overnight`) and pushed to main. Before continuing there, run `git pull`. One small change of mine (the Continue/Submit buttons in `BecomeAdvisor.tsx`) may need merging with your edits.

---

## 4. Launch readiness: what's left before Stripe live mode and announcing

1. **Do 3A (Lovable).** Without it the waitlist doesn't save emails, and the backend fixes (refund message, email links, safety checks) aren't live.
2. **Get at least a few real advisors approved and listed**, then use **Remove all sample advisors** in Admin. Today every advisor is a sample, so nobody can actually book.
3. **Confirm photo rights** (3D) and **set up auth email sending** (3D).
4. **Google sign-in** (3B). Optional, but it reduces sign-up friction.
5. **Switch Stripe to live mode in Lovable's secrets.** Then make one real low-value booking yourself and refund it, to confirm the live keys, the webhook, and the confirmation emails.
6. **Check sales tax.** Checkout has automatic tax turned on, but my test payments showed $0 tax. If you need to collect tax, finish Stripe Tax setup (registrations) in the Stripe dashboard.

---

## 5. How to roll back

Before I started, I tagged your site as **`pre-overnight`** on GitHub.

- **Undo everything:** in the repo run `git checkout main && git reset --hard pre-overnight && git push --force origin main`. Cloudflare will redeploy the old site. (A force-push rewrites history, so you could instead ask a developer, or me, to revert the individual commits.)
- **Undo one change:** each change is its own small commit on main (see `git log pre-overnight..main`) and can be reverted on its own with `git revert <commit>`.
- The database migration hasn't been applied, so there's nothing to roll back there yet.
