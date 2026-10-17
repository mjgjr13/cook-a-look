# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Clients (primary):** men and women aged 25–55 with disposable income who want to dress well. Why they come varies from person to person:

- work and everyday life;
- a big day, such as a wedding or a date;
- simply wanting to be told what to wear by someone who knows what they're talking about;
- being short on time.

Their job is to find an advisor they trust, book a session at a time that suits them, and leave knowing what to wear, keep, tailor and buy.

**Advisors (second audience):** independent stylists who apply through Become an Advisor. Each one:

- is reviewed and identity-verified;
- sets their own hourly rate and availability;
- connects Stripe for payouts;
- runs sessions by video or in person.

Advisor-facing pages (sign-up, dashboard, availability, earnings, settings) matter as much as the client-facing ones.

## Product Purpose

Cook A Look is a marketplace where clients book a one-on-one session with a style advisor of their choosing, by video or in person. It exists so that expert, personal style advice is easy to find, priced openly, and safe to pay for. Success for a client is a booked, completed session that ends with a plan. Success for an advisor is steady bookings and reliable payouts.

## Positioning

- **You pick your advisor.** Clients choose a specific, independent advisor from real profiles, not an assigned stylist.
- **Advice, not selling.** Advisors are paid for the session, not commission on clothes, so the advice serves the client.
- **Upfront and protected.** The full price is shown before booking. Payment is held in escrow until 48 hours after the session. Clients get a full refund if the advisor cancels or doesn't show.
- **Video or in person.** Hourly sessions run by video from anywhere (in the browser, no app), or in person locally at an agreed public place.

## Operating Context

**Booking:**
- Clients browse advisors, view a profile, and book 1, 2 or 3 hours.
- Total = hourly rate × hours, plus any in-person surcharge.
- Times are shown in the client's local time zone.
- Checkout goes through Stripe, and an account is created at booking time if needed.

**Sessions and payment:**
- Video sessions run in the browser (Daily, with a Jitsi fallback).
- In-person sessions happen at the advisor's preset locations or at a client-suggested place the advisor approves.
- Payment releases to the advisor when the client marks the session complete, or 48 hours after the session ends with no dispute.
- Disputes are for real problems with a session, not for disliking the advice.
- Platform fee: 15% per booking, 10% from the 10th completed booking in a calendar month (`docs/notes/features/payments/platform-fee-structure.md`).

**Other features:**
- The AI Concierge (Claude-based chat) helps clients figure out what they need and suggests advisors.
- Email confirmations and reminders are sent at each step.

## Capabilities and Constraints

**Stack and services:**
- Front end: React, Vite, Tailwind and shadcn, hosted on Cloudflare Pages.
- Back end: Supabase project CAL (database, auth, storage, edge functions).
- Payments: Stripe, currently in test mode.

**Current scale:** four advisors are listed. James Whitaker is the real, bookable test advisor; Diane Holloway, Marcus Reed and Maya Ellison are sample profiles.

**Supabase image transforms are off** (free plan), so advisor photos are served at upload size.

**Design work does not change** Supabase functions, Stripe logic or database code. Booking, payment and database rules live in `docs/notes/` and `supabase/migrations/`.

**Terminology:**
- Say "style advisor", not "stylist" or "consultant", in client-facing copy.
- A "session" is the booked appointment.
- "Sample profile" marks a demonstration advisor.

## Brand Commitments

- **Name:** Cook A Look.
- **Tagline:** "The Recipe to Dressing Well."
- **Binding:**
  - the cream and black palette;
  - the Cormorant Garamond uppercase wordmark with the sunglasses mark (`src/components/CookALookLogo.tsx`; also used in the email PNGs);
  - the tagline.
- **Feel:** a quietly expensive boutique, not a tech startup.
- **Voice:** plain, specific and warm, with no hype ("elevate your style to new heights" is off-voice).
- **Changes to the homepage hero need the owner's approval.**

## Evidence on Hand

- **Advisor portraits** (real, editorial photos) in Supabase storage, `avatars` bucket.
- **James Whitaker's portfolio photos** on his profile.
- **No client reviews yet.** Reviews come only from completed sessions.
- **Not real evidence:** `src/assets/inspiration-1..4.jpg`, shown as sample-profile inspiration, look AI-generated. Don't use them as hero or brand imagery.
- **Hero photo:** the owner will supply their own. Until then the hero shows the advisor portraits.
- **Absent, never to be fabricated:** reviews, testimonials, client counts, press mentions, or ratings. Sample profiles must always be labelled as samples.

## Product Principles

1. **The human advisor is the product.** Booking a person is the main action everywhere. The AI Concierge supports that choice and never competes with it.
2. **Honest by default.** Show real prices, real availability and real people. Label samples, and never invent proof or urgency.
3. **Reassure at the moment of paying.** The price, the date and time, who the session is with, and what protects the client stay visible when they commit.
4. **Respect people's time.** Short paths from "I need help" to a booked slot, with no dead ends (empty days offer the next available date).
5. **Both sides matter.** Advisor-facing flows get the same care as client-facing ones.

## Accessibility & Inclusion

The audience runs to age 55 and often books on a phone. Keep these minimums:

- body text of at least 15px, and nothing under 12px;
- tap targets of 44px;
- WCAG AA contrast;
- visible keyboard focus;
- respect for "reduce motion".

The audience includes both men and women, so imagery and copy should not default to one.
