
# Display Bookings Across All Dashboards

## Problem Analysis

After reviewing the booking flow, the core issue is that after completing a payment:

1. **Stripe test mode issue** (just fixed) - Payments were failing because the live key was being used with test cards, which meant the `verify-payment` function never successfully created bookings.

2. **Missing Admin Bookings View** - The admin dashboard only shows a booking count, but there's no dedicated page to view and manage individual bookings.

## What Already Works

The codebase already has:
- Client Dashboard displays bookings where `client_id` matches the logged-in user
- Advisor Dashboard displays bookings where `advisor_id` matches the logged-in user
- "Join Call" button that triggers the video room creation
- RLS policies allowing clients and advisors to view their own bookings

## What Needs to Be Added

### 1. Admin Bookings Management Page
Create a new admin page to view, filter, and monitor all bookings platform-wide.

| File | Action |
|------|--------|
| `src/pages/admin/AdminBookings.tsx` | Create new page |
| `src/App.tsx` | Add route `/admin/bookings` |
| `src/pages/admin/AdminDashboard.tsx` | Add link to bookings page |

### 2. Realtime Updates for Dashboards
Enable realtime subscriptions so bookings appear immediately without page refresh.

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Add realtime subscription |
| `src/pages/AdvisorDashboard.tsx` | Add realtime subscription |

---

## Technical Implementation

### Admin Bookings Page Features

```text
┌─────────────────────────────────────────────────────────────┐
│                 ADMIN BOOKINGS PAGE                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ All         │ │ Upcoming    │ │ Completed   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Search by client or advisor name...                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Booking #1                                          │    │
│  │ Client: John Doe → Advisor: Jane Smith              │    │
│  │ Date: Feb 1, 2026 at 2:00 PM                        │    │
│  │ Status: confirmed | Virtual: Yes                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  │ ... more bookings ...                               │    │
└─────────────────────────────────────────────────────────────┘
```

**Admin can:**
- View all bookings with client/advisor names
- Filter by status (all, upcoming, completed, cancelled)
- Search by client or advisor name
- See booking details (date, time, virtual/in-person)

### Dashboard Realtime Subscriptions

Both client and advisor dashboards will subscribe to booking changes:

```text
┌─────────────────────────────────────────────────────────────┐
│                   REALTIME FLOW                             │
├─────────────────────────────────────────────────────────────┤
│  1. Payment completes → verify-payment creates booking      │
│  2. Supabase broadcasts INSERT event on bookings table      │
│  3. Client dashboard receives event → refetches bookings    │
│  4. Advisor dashboard receives event → refetches bookings   │
│  5. Both dashboards update instantly without page refresh   │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/admin/AdminBookings.tsx` | New page for viewing all bookings |
| `src/App.tsx` | Add route for `/admin/bookings` |
| `src/pages/admin/AdminDashboard.tsx` | Add "Manage Bookings" card with link |
| `src/pages/Dashboard.tsx` | Add realtime subscription for instant updates |
| `src/pages/AdvisorDashboard.tsx` | Add realtime subscription for instant updates |

---

## Database Change

Enable realtime on the bookings table (if not already enabled):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

---

## Testing Verification

After implementation:
1. Use the test Stripe key to complete a booking
2. Verify the booking appears immediately on the client dashboard
3. Verify the booking appears on the advisor dashboard
4. Verify the booking is visible in the admin bookings page
5. Test the "Join Call" button opens the video room
