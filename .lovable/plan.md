

# Updated Launch Plan: 15% Fee Display + Camera Fix

## Summary of Changes Required

Based on your feedback, I need to clarify the pricing model and fix the liveness camera:

1. **Pricing Display Logic (Corrected)**
   - **Buyers**: See the final price only (no breakdown of platform fees) - this is already how it works
   - **Advisors**: When setting their rate, show them what they'll receive AFTER the 15% fee is deducted
   - The advisor sets the "client price", and Cook a Look takes 15% of that

2. **Liveness Camera Fix**
   - The current implementation requires explicit camera permission and appears to be working, but I'll ensure it handles all edge cases and provides better user feedback

---

## Part 1: Pricing Model Clarification

### How It Should Work

```text
Advisor sets their rate: $100 (what client pays)
Cook a Look takes: $15 (15% platform fee)  
Advisor receives: $85 (85% of the rate)

Displayed to Client: $100 (+ applicable taxes)
Displayed to Advisor (settings): 
  "Your session rate: $100"
  "You will receive: $85 (after 15% platform fee)"
```

### Changes Needed

#### 1. Update Advisor Settings Page (AccountSettings.tsx)
**Current:** Simple price input with label "Price per Session ($)"
**New:** 
- Same input but with helper text showing: "You will receive: $X.XX (after 15% Cook a Look fee)"
- Add an info box explaining the fee structure
- Calculate and display: `price * 0.85` as what they'll actually receive

Example UI:
```text
Price per Session ($)
[  100  ]
After our 15% platform fee, you'll receive: $85.00 per session
```

#### 2. Update Create-Checkout Edge Function (Optional Enhancement)
**Current:** Charges the advisor's set price directly
**New:** No change needed - the price shown to clients is the price charged, Cook a Look takes 15% internally

#### 3. Update Payments Table (Database Migration)
**Current:** Has `amount` column
**New:** Add `platform_fee` and `advisor_payout` columns for tracking:
```sql
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS advisor_payout NUMERIC DEFAULT 0;
```

#### 4. Update Verify-Payment Edge Function
When recording payment, calculate and store:
- `amount` = total paid by client (excluding tax)
- `platform_fee` = amount * 0.15
- `advisor_payout` = amount * 0.85

---

## Part 2: Liveness Camera Fix

### Current Implementation Analysis

The `LivenessCamera.tsx` component:
1. Requests camera access via `navigator.mediaDevices.getUserMedia()`
2. Runs a liveness detection sequence (blink, head turn)
3. Captures a photo after verification
4. Returns the image blob and verification status

### Potential Issues Identified

1. **Browser Permissions**: Camera may be blocked by browser settings
2. **HTTPS Requirement**: Camera only works on HTTPS (which Lovable provides)
3. **Mobile Compatibility**: `facingMode: "user"` should work but may need fallback
4. **No Clear Error Handling**: User may not understand why camera isn't starting

### Fixes to Implement

1. **Add better error messages** with specific guidance:
   - "Camera access denied - please allow camera access in your browser settings"
   - "Camera not available - please ensure your device has a camera"

2. **Add a camera test button** before starting the liveness flow
   - User can verify camera works before committing to the flow

3. **Add browser compatibility check**
   - Check if `navigator.mediaDevices` is available
   - Provide fallback instructions for unsupported browsers

4. **Improve mobile handling**
   - Try multiple camera configurations if the first fails
   - Handle iOS Safari quirks with `playsInline` attribute (already present)

5. **Add visible loading state** while camera initializes

---

## Part 3: File Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AccountSettings.tsx` | Add fee calculation display under price input, info box about 15% fee |
| `src/components/LivenessCamera.tsx` | Improve error handling, add browser compatibility check, better loading states |
| `supabase/functions/verify-payment/index.ts` | Calculate and store platform_fee and advisor_payout |
| Database migration | Add platform_fee and advisor_payout columns to payments table |

### Files Already Correct (No Changes Needed)

| File | Reason |
|------|--------|
| `src/pages/Advisors.tsx` | Price display correct - shows advisor's rate to buyers |
| `src/pages/AdvisorProfile.tsx` | Price display correct - shows advisor's rate to buyers |
| `src/components/home/FeaturedAdvisors.tsx` | Price display correct - shows advisor's rate to buyers |
| `src/components/BookingCalendar.tsx` | Price display correct - shows session price to buyers |
| `supabase/functions/create-checkout/index.ts` | Correct - charges advisor's set price |

---

## Part 4: Updated Prompt for Implementation

Here's the exact prompt to give me for implementation:

---

**Prompt:**

"Implement these changes:

1. **Advisor Settings - Add 15% Fee Display**
   - In AccountSettings.tsx, under the price input field, add helper text that calculates and shows: 'You will receive: $XX.XX (after 15% Cook a Look fee)' 
   - Add an info box explaining: 'Cook a Look charges a 15% platform fee on all bookings. The price you set is what clients pay.'

2. **Fix Liveness Camera**
   - Add browser compatibility check at component mount (check for navigator.mediaDevices support)
   - Improve error messages with specific troubleshooting steps (permissions, camera availability)
   - Add a visible loading indicator while the camera initializes
   - Add fallback camera configurations for mobile devices

3. **Add Platform Fee Tracking**
   - Create database migration to add platform_fee and advisor_payout columns to payments table
   - Update verify-payment edge function to calculate and store: platform_fee (15%) and advisor_payout (85%)

Do not change any buyer-facing price displays - they should continue to show the advisor's set rate."

---

## Part 5: Admin Responsibilities Recap

### Your Sign-In Process
1. Go to: https://cookalookcom.lovable.app/signin
2. Enter your admin email and password
3. Navigate to: https://cookalookcom.lovable.app/admin

### What You Can Do in Admin
- **Review Applications** at `/admin/advisors` (Applications tab)
  - View verification photos (selfie + ID)
  - See liveness verification status
  - Approve or deny applications
- **Manage Active Advisors** at `/admin/advisors` (Active Advisors tab)
  - Activate/deactivate advisors
  - Toggle demo availability
- **Manage Lookbook** at `/admin/lookbook`
  - Add style inspiration content

### One Manual Action Still Required
Enable "Leaked Password Protection" in your backend authentication settings for enhanced security.

