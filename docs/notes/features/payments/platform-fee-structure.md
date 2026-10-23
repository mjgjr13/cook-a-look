---
name: Platform fee structure
description: Flat 15% platform fee on every booking; the 10% monthly loyalty tier was removed on 2026-10-22
type: feature
---

Advisors set an **hourly rate**. Clients book in 1-, 2-, or 3-hour increments (max 3 hours per booking). Total = hourly rate × hours.

Platform fee: a flat **15%** of the session price (tax and any client booking fee excluded) on every booking. On a $100 session the advisor receives $85. Stripe processing fees come out of the platform's 15%, not the advisor's share; currency conversion (USD charge, CAD platform balance) can move the final transfer by a few cents.

The rate lives in two constants that must change together: `src/lib/fees.ts` (website copy and maths) and `supabase/functions/_shared/fees.ts` (what payments record). Pricing isn't final (a monthly plan is being considered).

History: until 2026-10-22, bookings after the 9th completed booking in a calendar month were charged 10%. The owner scrapped it before any real advisors joined. The old `reward_settings` keys (`advisor_default_fee_percent`, `advisor_reduced_fee_percent`, `advisor_fee_reduction_threshold`) and `advisor_monthly_stats.reduced_fee_unlocked` are still in the database but nothing reads them.
