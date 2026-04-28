## Best way forward: stabilize the full customer/advisor/admin journey in phases

The fastest, safest path is not to keep tweaking individual items like favicon/OG image one by one. We should run an end-to-end launch audit, fix blockers by priority, then verify the core revenue flow from signup through booking/payment and post-booking dashboards.

## Phase 1: Establish the critical path

Primary flow to make production-ready first:

```text
Visitor lands on site
  -> browses advisors
  -> opens advisor profile
  -> signs up / signs in
  -> selects availability
  -> pays for consultation
  -> booking is confirmed
  -> client sees booking in dashboard
  -> advisor sees booking in dashboard
  -> video/session actions work
  -> confirmation emails send
```

Secondary but important flows:
- Advisor application and onboarding
- Admin approval of advisors
- Advisor availability setup
- Client/advisor messaging
- Reviews after completed sessions
- SEO/social/favicons/published-domain polish

## Phase 2: Run a technical audit before changing code

I will inspect and test these areas:

1. Authentication
   - Signup, email confirmation behavior, signin, signout, password reset
   - Redirects after protected actions like booking
   - Google sign-in readiness if configured in Lovable Cloud

2. Public browsing
   - Homepage
   - Advisors listing
   - Advisor profile pages
   - Public advisor data visibility without leaking private profile data

3. Booking and payment
   - Availability display
   - Dynamic/legacy slot handling
   - Checkout creation
   - Payment success verification
   - Booking creation and duplicate-payment protection
   - Client/advisor dashboard visibility after payment

4. Advisor lifecycle
   - Become-advisor flow
   - Profile completion
   - Availability management
   - Approval/pending/listed states
   - Earnings and withdrawal request flow

5. Admin workflow
   - Admin role detection
   - Advisor approvals
   - Bookings, payments, rewards, lookbook management

6. Backend functions and secrets
   - Payment functions
   - Email functions
   - AI style concierge
   - Video room function
   - Confirm required secrets are present without exposing values

7. SEO and launch polish
   - Favicon compatibility and Google cache strategy
   - Open Graph PNG asset completion
   - Meta tags, robots.txt, sitemap, canonical domain consistency
   - Published/custom domain behavior

8. Security and data rules
   - Row-level security policies
   - Role checks via backend/database roles only
   - No private data exposed publicly
   - Protected routes match backend access rules

## Phase 3: Fix blockers by priority

I will group issues into:

### P0: Must fix before launch
Examples:
- Signup/login broken
- Booking cannot complete
- Payment verification fails
- Dashboard cannot load paid bookings
- Security policies expose private data or block legitimate users
- Required backend secrets missing

### P1: Important for real users
Examples:
- Advisor onboarding confusion
- Missing empty states
- Email copy or delivery issues
- Mobile layout problems on booking/signin/dashboard
- Broken social preview or favicon fallback

### P2: Polish
Examples:
- SEO improvements
- Admin convenience improvements
- Better loading states
- Better help text

## Phase 4: Manual end-to-end QA checklist

After fixes, I will verify the following scenarios:

```text
Client QA
- New user can sign up
- Existing user can sign in
- Forgot/reset password works
- User can browse advisors
- User can book and pay
- Booking appears in client dashboard
- Client can access booking details/session actions

Advisor QA
- Advisor can apply
- Advisor can complete profile
- Advisor can set availability
- Approved advisor appears publicly
- Advisor receives/loads bookings
- Advisor can see earnings state

Admin QA
- Admin dashboard loads
- Admin can review advisor applications
- Admin can view bookings/payments
- Admin tools do not appear for normal users

Public/launch QA
- Published URL works
- Custom domain works
- Mobile navigation works
- Favicon is configured with SVG plus fallback
- OG image PNG exists and metadata points to it
- robots/sitemap are valid
```

## Likely immediate fixes based on current code review

These are the first areas I expect to address after approval:

1. Complete the social preview image
   - The metadata now points to `/images/og-preview.png`, but the actual PNG still needs to exist. I can generate/place it so social previews stop pointing to a missing asset.

2. Improve favicon compatibility
   - The SVG favicon is configured, but adding PNG/ICO fallbacks increases compatibility and helps crawlers that do not reliably use SVG favicons.

3. Verify payment and booking functions
   - The booking flow depends on backend payment functions, payment secrets, user auth, and booking creation. This should be tested as the main revenue path.

4. Verify email and AI backend secrets
   - Signup, booking confirmation, advisor confirmation, chat concierge, and payment functions may depend on configured secrets. Missing secrets should be handled cleanly or configured.

5. Fix any auth/profile edge cases
   - The app uses both authentication state and profile/role loading. I will test for redirect loops, missing profiles, and post-signup behavior.

## Technical implementation approach

- Use existing React/Vite/Tailwind patterns.
- Keep backend data in Lovable Cloud.
- Do not manually edit generated backend client/type files.
- Use database migrations only if schema/RLS changes are required.
- Keep role checks server/database-backed, not local storage or hardcoded credentials.
- Add targeted fixes rather than broad rewrites.
- Run build/lint where practical and verify key routes in the browser preview.

## Recommended next action

Approve this plan and I’ll start with the P0 audit/fixes: authentication, advisor browsing, booking/payment, dashboard visibility, backend function health, then finish with favicon/OG/social launch polish.