

# Backend Integration Diagnosis & Fix Plan

## Current Status: Supabase IS Connected and Working

Your backend is fully connected to Lovable Cloud (Supabase). Here's the proof:

**Working Components:**
- Database connection: Active (4 users, 15 tables)
- Authentication: Working (users can sign up, sign in)
- RLS policies: Configured and enforcing security
- Database functions: 12 functions exist
- Storage buckets: 4 buckets configured (avatars, portfolios, etc.)

**The Real Problem: Missing Automation**

The database functions exist but **no triggers are attached** to run them automatically. This means:
- When a user signs up, `handle_new_user()` may not create a profile automatically
- When an advisor is approved, data doesn't sync between tables
- Booking slots aren't auto-marked as booked/unbooked

## Root Cause: Data Synchronization Issues

| Issue | Current State | Impact |
|-------|---------------|--------|
| Profile trigger not attached | `handle_new_user()` function exists but no trigger | Profiles may not auto-create on signup |
| No advisor sync trigger | Advisor data stored in 2 places | `is_listed: false` even for approved advisors |
| No booking automation | Slots don't auto-update | Manual intervention needed |

**Current Data State:**
- 1 approved advisor (marceljg8@gmail.com)
- But `advisor_profiles.is_listed = false` ← Prevents public display
- The `get_public_advisor_profiles()` RPC returns data correctly
- 3 other users are clients only

## Solution: Add Missing Database Triggers

### Phase 1: Fix Profile Auto-Creation Trigger

Attach the existing `handle_new_user()` function to auth.users:

```sql
-- This trigger should already exist but may be missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Phase 2: Add Advisor Data Sync Trigger

Create a trigger to keep `profiles` and `advisor_profiles` in sync:

```sql
CREATE OR REPLACE FUNCTION sync_advisor_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When advisor_profiles status changes, update profiles table
  UPDATE profiles SET
    is_advisor = (NEW.application_status = 'approved'),
    advisor_approved = (NEW.application_status = 'approved'),
    advisor_status = NEW.application_status
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_advisor_profile_change
  AFTER INSERT OR UPDATE OF application_status ON advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_advisor_status();
```

### Phase 3: Auto-List Approved Advisors

Fix the current data and ensure approved advisors are listed:

```sql
-- Fix current data: approved advisors should be listed
UPDATE advisor_profiles 
SET is_listed = true 
WHERE application_status = 'approved' 
  AND onboarding_status = 'complete';
```

### Phase 4: Booking Automation Triggers

```sql
-- Auto-mark slot as booked when booking created
CREATE OR REPLACE FUNCTION mark_slot_booked()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE availability_slots SET is_booked = true WHERE id = NEW.slot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION mark_slot_booked();

-- Auto-unbook slot on cancellation
CREATE OR REPLACE FUNCTION unbook_slot_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE availability_slots SET is_booked = false WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION unbook_slot_on_cancel();
```

### Phase 5: Enable Real-Time Updates

Add real-time subscriptions so the UI updates instantly:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE availability_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE advisor_profiles;
```

## How to Access Your Backend

You can view and manage your backend data directly through Lovable:

1. Click the **"View Backend"** button below
2. This opens Cloud View where you can:
   - View all database tables and their data
   - Run SQL queries
   - Check authentication users
   - Monitor edge functions

## Summary of Changes

| Component | Action |
|-----------|--------|
| **Trigger: Profile creation** | Attach `handle_new_user()` to auth.users |
| **Trigger: Advisor sync** | Create new trigger for `advisor_profiles` → `profiles` sync |
| **Trigger: Booking automation** | Create triggers to auto-update slot booking status |
| **Data fix** | Set `is_listed = true` for approved advisors |
| **Realtime** | Enable for bookings, slots, and advisor profiles |
| **Admin flow** | Ensure approval also sets `is_listed = true` |

## Files to Modify

1. **Database migrations** - Add all triggers and functions
2. `src/pages/admin/AdminAdvisors.tsx` - Update approval to set `is_listed = true`
3. `src/pages/AdvisorDashboard.tsx` - Add real-time subscription for bookings
4. `src/pages/Dashboard.tsx` - Add real-time subscription for client bookings

