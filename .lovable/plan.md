
# Comprehensive Platform Fixes and Features Implementation Plan

## Summary
This plan addresses 10 major areas: authentication bugs, camera verification reliability, booking/availability issues, advisor management enhancements, dynamic lookbook categories, payment flow restructuring with escrow, financial dashboard updates, dispute system with session recordings, Terms of Use updates, and advisor onboarding acknowledgment.

---

## Phase 1: Critical Authentication & Profile Fixes

### 1.1 Fix "Error loading profile" on Sign In / Create Account
**Problem**: The Dashboard.tsx shows "Error loading profile" when no profile exists after signup.

**Solution**:
- Verify the database trigger `handle_new_user()` is functioning correctly
- Add fallback profile creation in Dashboard if trigger fails
- Add retry logic and better error handling in Dashboard.tsx
- Add timeout handling to prevent infinite loading states

**Files to modify**:
- `src/pages/Dashboard.tsx` - Add profile creation fallback, loading timeout (10 seconds max), retry button
- `src/contexts/AuthContext.tsx` - Add profile loading status to context

### 1.2 Prevent Infinite "Loading dashboard…" States
**Solution**:
- Add 10-second timeout with retry/error UI
- Show specific error messages based on failure type
- Add "Retry" button when loading fails

---

## Phase 2: Camera Verification Improvements

### 2.1 Fix Camera Hanging Issues
**Current problem**: Camera can hang indefinitely during initialization.

**Solution**:
- Add 15-second overall timeout for camera initialization
- Add retry counter (max 3 attempts)
- Add progress indicators during each step
- Add clear error states with actionable next steps

### 2.2 Add Manual Photo Upload Fallback
**Solution**:
- Add a "Having trouble with camera?" link after 2 failed attempts
- Show file upload option as fallback
- Mark `livenessVerified: false` for manual uploads so admin can flag for review
- Update submit-advisor-application edge function to accept manual uploads

**Files to modify**:
- `src/components/LivenessCamera.tsx` - Add timeout handling, retry logic, upload fallback
- `src/pages/BecomeAdvisor.tsx` - Handle fallback upload flow

---

## Phase 3: Booking & Availability Fixes

### 3.1 Fix Calendar Showing No Available Dates
**Current issue**: Calendar may not show slots due to timezone issues or RLS policy restrictions.

**Solution**:
- Add better timezone handling (convert to UTC consistently)
- Add "No availability" messaging with next steps
- Ensure RLS policy allows reading future unbooked slots

### 3.2 Admin Availability Override
**Solution**:
- Enhance existing `demo_availability_enabled` toggle in AdminAdvisors
- Allow admin to create/edit availability slots for any advisor
- Add "Generate Test Slots" button that works for any advisor (not just demo)

**Files to modify**:
- `src/pages/admin/AdminAdvisors.tsx` - Add direct slot management for any advisor
- `src/components/BookingCalendar.tsx` - Improve messaging when no slots exist

---

## Phase 4: Admin Advisor Management Enhancements

### 4.1 Show ALL Advisor Accounts
**Current issue**: Only showing `is_advisor = true` profiles.

**Solution**:
- Fetch all profiles that have ever applied or been marked as advisors
- Show statuses: Draft (applied but not approved), Pending, Verified, Rejected, Test/Demo
- Add filtering by all statuses

### 4.2 Enable Admin Deletion and Status Override
**Solution**:
- Add "Delete Advisor" button with confirmation
- Add dropdown to change advisor status (approved, suspended, pending review)
- Add ability to reset application status

**Files to modify**:
- `src/pages/admin/AdminAdvisors.tsx` - Expand queries, add delete/status controls

---

## Phase 5: Dynamic Lookbook Categories

### 5.1 Create Categories Database Table
**Database changes**:
```sql
CREATE TABLE public.lookbook_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with existing categories
INSERT INTO lookbook_categories (name, display_order) VALUES
  ('Business', 1), ('Casual', 2), ('Evening', 3), 
  ('Streetwear', 4), ('Formal', 5), ('Athletic', 6);

-- RLS: Public read, admin write
```

### 5.2 Update AdminLookbook
**Solution**:
- Add category management section (add/edit/delete/reorder)
- Replace hardcoded `categories` array with database fetch
- Add inline "Add new category" option in dropdown

**Files to modify**:
- `src/pages/admin/AdminLookbook.tsx` - Category management UI
- `src/pages/Lookbook.tsx` - Fetch categories from database

---

## Phase 6: Payment Flow Restructure (Escrow System)

### 6.1 Database Schema Changes
**New/modified tables**:
```sql
-- Add escrow tracking to payments table
ALTER TABLE payments ADD COLUMN escrow_status TEXT DEFAULT 'held'; -- 'held', 'released', 'disputed'
ALTER TABLE payments ADD COLUMN escrow_release_at TIMESTAMPTZ; -- 48 hours after meeting start
ALTER TABLE payments ADD COLUMN meeting_started_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN stripe_transfer_id TEXT;

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  raised_by UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'resolved_client', 'resolved_advisor', 'closed'
  admin_notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);
```

### 6.2 Automatic Escrow Release Edge Function
**New edge function**: `release-escrow`
- Called by a scheduled job (Supabase cron) every hour
- Checks for payments where:
  - `escrow_status = 'held'`
  - `escrow_release_at < now()` (48 hours after meeting)
  - No open disputes
- Uses Stripe Connect transfers to pay advisors

### 6.3 Update Payment UI
**Solution**:
- Advisors see "payout after session" amount (no percentage shown)
- Customers see only total price + tax at checkout
- Remove any references to "15%" from customer-facing UI

**Files to modify**:
- `src/pages/AccountSettings.tsx` - Show net payout without percentage
- `src/pages/AdvisorProfile.tsx` - Hide fee structure from clients
- `supabase/functions/verify-payment/index.ts` - Set escrow_release_at to meeting time + 48h

---

## Phase 7: Admin Financial Hub Restructure

### 7.1 Update Stats Cards
**Rename/restructure**:
- "Total Revenue" → Gross client payments (unchanged)
- "Platform Fees (15%)" → "Net Revenue" (remove percentage label)
- "Advisor Payouts" → Remove entirely
- "Pending Withdrawals" → "Funds in Escrow" (payments not yet released)

### 7.2 Add Escrow Management Tab
**New tab content**:
- List of payments in escrow with release countdown
- Override button to release early or hold for dispute
- Link to dispute details if applicable

**Files to modify**:
- `src/pages/admin/AdminPayments.tsx` - Restructure cards, add escrow tab

---

## Phase 8: Disputes, Escrow, & Session Recordings

### 8.1 Enable Daily.co Recording
**Solution**:
- Update `create-video-room` edge function to enable cloud recording
- Store recording URL in `video_sessions` table
- Add recording consent notice before joining calls

**Database changes**:
```sql
ALTER TABLE video_sessions ADD COLUMN recording_url TEXT;
ALTER TABLE video_sessions ADD COLUMN recording_status TEXT DEFAULT 'pending';
```

### 8.2 Create Dispute Submission Flow
**Client-facing**:
- "Report an Issue" button on past bookings (within 48h of meeting)
- Simple form: reason dropdown, description textarea
- Confirmation that dispute freezes payment

**Admin-facing**:
- Disputes tab in AdminPayments
- View dispute details, access recording
- Resolve in favor of client (refund) or advisor (release funds)

**Files to create**:
- `src/components/DisputeForm.tsx` - Client dispute submission
- Update `src/pages/Dashboard.tsx` - Add dispute button on recent sessions
- Update `src/pages/admin/AdminPayments.tsx` - Add disputes management

### 8.3 Recording Disclosure
**Solution**:
- Add notice in VideoCall component: "This session is being recorded"
- Pre-call modal confirming recording consent
- Update Terms of Use (Phase 9)

---

## Phase 9: Terms of Use & Expectations Updates

### 9.1 Add New Sections to Terms
**New content**:

**Advisor Expectations (Section 7)**:
- Professional conduct during all sessions
- Punctuality and preparedness
- No harassment, discrimination, or inappropriate behavior
- Compliance with virtual session recording policies
- Consequences for violations (suspension, termination)

**Customer Expectations (New Section)**:
- Respectful treatment of advisors
- No harassment, abuse, or inappropriate conduct
- Agreement to dispute window (48 hours from session start)
- Consequences for violations

**Recording & Privacy Notice**:
- Clear disclosure that virtual sessions are recorded
- Purpose: dispute resolution and quality assurance
- Who can access recordings (admins only)
- Retention period

**Files to modify**:
- `src/pages/TermsOfUse.tsx` - Add new sections

---

## Phase 10: Advisor Onboarding Training & Acknowledgment

### 10.1 Create Onboarding Modal
**New component**: `AdvisorOnboardingModal.tsx`
- Shown after first login as approved advisor
- Sections:
  1. Professional expectations summary
  2. Recording policy explanation
  3. Dispute/escrow process overview
  4. Payout schedule explanation
- Must scroll through all sections
- Checkbox acknowledgment required
- "I Understand & Agree" button

### 10.2 Database Tracking
```sql
ALTER TABLE profiles ADD COLUMN onboarding_acknowledged_at TIMESTAMPTZ;
```

### 10.3 Enforcement
- Block access to advisor features until acknowledged
- Check on Dashboard and availability pages
- Show modal if `onboarding_acknowledged_at` is null

**Files to create**:
- `src/components/advisor/AdvisorOnboardingModal.tsx`
- Update `src/pages/Dashboard.tsx` - Trigger modal for new advisors
- Update `src/pages/AdvisorAvailability.tsx` - Block until acknowledged

---

## Phase 11: Admin Access Restriction

### 11.1 Hardcode Admin Email
**Solution**:
- Ensure `marceljeangillesjr@gmail.com` has admin role in `user_roles` table
- Add explicit email check in AdminRoute as secondary protection
- Log unauthorized access attempts

**Files to modify**:
- `src/components/AdminRoute.tsx` - Add email verification layer
- Database: Verify user_roles entry exists

---

## Implementation Order

1. **Day 1**: Authentication & Profile fixes (Phase 1)
2. **Day 1**: Admin access restriction (Phase 11)
3. **Day 2**: Camera verification improvements (Phase 2)
4. **Day 2**: Booking & Availability fixes (Phase 3)
5. **Day 3**: Admin Advisor Management (Phase 4)
6. **Day 3**: Dynamic Lookbook Categories (Phase 5)
7. **Day 4**: Payment/Escrow database schema (Phase 6.1)
8. **Day 4**: Payment flow updates (Phase 6.2-6.3)
9. **Day 5**: Admin Financial Hub (Phase 7)
10. **Day 5**: Recording setup (Phase 8.1)
11. **Day 6**: Dispute system (Phase 8.2-8.3)
12. **Day 6**: Terms of Use updates (Phase 9)
13. **Day 7**: Advisor onboarding flow (Phase 10)

---

## Technical Requirements

### New Edge Functions
1. `release-escrow` - Automatic escrow release via Stripe Connect
2. Modifications to `create-video-room` - Enable Daily.co recording

### Database Migrations
1. New table: `lookbook_categories`
2. New table: `disputes`
3. Modifications to `payments`: escrow fields
4. Modifications to `video_sessions`: recording fields
5. Modifications to `profiles`: onboarding acknowledgment

### External Service Configuration
- **Daily.co**: Enable cloud recording in dashboard settings
- **Stripe Connect**: Required for automatic advisor payouts (will need business verification)

### Notes on Stripe Connect
Setting up automatic escrow release requires Stripe Connect, which involves:
- Business verification with Stripe
- Advisors onboarding as "connected accounts"
- Additional compliance requirements

For initial launch, we can implement the "track-only" escrow model where:
- Database tracks escrow status and release timing
- Admin manually processes payouts via existing withdrawal system
- System shows countdown to release and blocks early withdrawal
