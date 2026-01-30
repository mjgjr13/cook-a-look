
# Fix: Client Booking Visibility and Remove "Check Availability" Button

## Problem Summary

Two issues need to be addressed:
1. **Clients cannot see advisor availability slots** - Even when advisors mark time as available, clients viewing the booking calendar see "No available slots for this date"
2. **Remove the "Check Availability" button** - User wants only the "Book Consultation" button

## Root Cause Analysis

The database RLS policy for `availability_slots` restricts SELECT access to **authenticated users only**:

```sql
Policy: "Authenticated users can view future availability"
Roles: {authenticated}  -- <-- Only applies to logged-in users!
Expression: ((start_time > now()) AND (is_booked = false))
```

When a client visits an advisor profile page:
- If NOT logged in: Uses `anon` role, which has NO policy allowing SELECT on availability_slots
- Result: Query returns empty array, showing "No available slots"

## Solution

### 1. Update RLS Policy to Allow Public Access
Modify the availability_slots SELECT policy to include anonymous users (public visitors) so anyone can view available booking slots.

| Before | After |
|--------|-------|
| Only `authenticated` role can SELECT | Both `anon` and `authenticated` roles can SELECT |

### 2. Remove "Check Availability" Button  
Remove the separate "Check Availability" button from the advisor profile page. Keep only "Book Consultation".

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Update RLS policy to allow public access to future availability |
| `src/pages/AdvisorProfile.tsx` | Remove "Check Availability" button and related handler |
| `src/components/BookingCalendar.tsx` | Remove "availability" mode UI since it's no longer needed |

## Implementation Details

### Database Migration
```sql
-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view future availability" ON availability_slots;

-- Create new policy allowing all users (including anonymous) to view future, unbooked slots
CREATE POLICY "Anyone can view future availability"
  ON availability_slots
  FOR SELECT
  USING ((start_time > now()) AND (is_booked = false));
```

This allows anyone to view which time slots are available, which is necessary for the booking flow to work. Sensitive information (like who booked a slot) is NOT exposed by this policy.

### AdvisorProfile.tsx Changes
- Remove `handleCheckAvailability` function
- Remove the "Check Availability" button from the UI
- Remove `calendarMode` state since there's only one mode now
- Update `BookingCalendar` to always use "booking" mode

### BookingCalendar.tsx Changes  
- Remove the `mode` prop since it's always "booking"
- Remove conditional UI for "availability" mode
- Simplify the component

## Security Considerations

Allowing public read access to availability_slots is safe because:
- Only exposes time slot availability (start/end time, virtual flag)
- Does NOT expose who booked a slot
- Advisor ID is already public (visible on profile page)
- This is standard for booking systems (think Calendly, Google Calendar booking pages)
