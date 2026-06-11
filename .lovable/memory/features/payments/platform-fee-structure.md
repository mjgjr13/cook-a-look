---
name: Platform fee structure
description: 15% standard platform fee per booking; drops to 10% for additional bookings after 9 completed bookings in the same calendar month
type: feature
---

Advisors set an **hourly rate**. Clients book in 1-, 2-, or 3-hour increments (max 3 hours per booking). Total = hourly rate × hours.

Platform fee per completed booking:
- Bookings 1–9 in a calendar month: **15%**
- Booking 10+ in the same month: **10%**

Threshold lives in `reward_settings.advisor_fee_reduction_threshold` (= 9). The `update_advisor_booking_stats` trigger flips `advisor_monthly_stats.reduced_fee_unlocked` once the 9th completed booking lands. UI copy must say "after 9 bookings… 10%" — never "5%".
