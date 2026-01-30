
# Fix: Ensure Visibility Toggle Always Remains Accessible for Approved Advisors

## Problem Summary

When an advisor turns their visibility OFF, the toggle completely disappears from both the Dashboard and Settings pages, making it impossible to turn visibility back ON.

**Root Cause**: The system incorrectly conflates two separate concepts:

| Concept | Current Behavior | Correct Behavior |
|---------|-----------------|------------------|
| **Admin Approval** (`advisor_approved`) | Set to `false` when visibility is OFF | Should remain `true` once admin approves |
| **Public Visibility** (`is_listed`) | Correctly toggled | No change needed |

When `toggleVisibility` turns off listing, it also sets `advisor_approved = false`, which causes `isApprovedAdvisor` to become false, hiding the toggle.

---

## Solution: Separate Admin Approval from Visibility

### Part 1: Fix the Toggle Visibility Logic

In `src/hooks/useAdvisorProfile.ts`, the `toggleVisibility` function should **NOT** update `advisor_approved`. This field should only be set by admin actions.

**Current code (lines 192-206)**:
```typescript
// Also update profiles.advisor_approved based on visibility
// advisor_approved = true only when admin-approved AND visibility is ON
if (userProfile) {
  const { error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user?.id)
    .single();

  if (!profileError) {
    await supabase
      .from("profiles")
      .update({ advisor_approved: newValue })
      .eq("user_id", user?.id);
  }
}
```

**Fix**: Remove this entire block. The `advisor_approved` flag should represent "admin has approved this advisor" and should NOT change based on visibility toggle.

### Part 2: Update Role Detection Logic

In `src/hooks/useProfile.ts`, the `isApprovedAdvisor` check should look at the `advisor_profiles.application_status` instead of (or in addition to) `profiles.advisor_approved`.

**Current logic (line 91)**:
```typescript
isApprovedAdvisor: profileData.is_advisor === true && profileData.advisor_approved === true,
```

**Updated approach**: Query `advisor_profiles.application_status === 'approved'` to determine if the advisor was admin-approved, independent of their visibility choice.

### Part 3: Update Conditional Rendering

In both `AdvisorDashboard.tsx` and `AccountSettings.tsx`, ensure the visibility toggle appears for **any advisor who has been admin-approved**, regardless of whether `is_listed` is true or false.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAdvisorProfile.ts` | Remove the code that sets `advisor_approved = false` when visibility is toggled off |
| `src/hooks/useProfile.ts` | Update role detection to check `advisor_profiles.application_status` for admin approval status |
| `src/pages/AdvisorDashboard.tsx` | Ensure toggle is shown based on admin approval, not visibility state |
| `src/pages/AccountSettings.tsx` | Same as above |

---

## Expected Outcome

After these changes:
- Admin approval status (`advisor_approved` or `application_status`) remains unchanged when advisor toggles visibility
- Visibility toggle remains accessible on both Dashboard and Settings when an advisor turns it OFF
- Advisors can freely toggle their public listing on and off
- The public `/advisors` page correctly shows only advisors with `is_listed = true`

---

## Technical Details

### Data Flow After Fix

```text
Admin approves advisor
       │
       ▼
advisor_profiles.application_status = 'approved'
       │
       ▼
Advisor can access visibility toggle (always visible in Dashboard/Settings)
       │
       ├──► Toggle ON  → is_listed = true  → Appears on /advisors
       │
       └──► Toggle OFF → is_listed = false → Hidden from /advisors
                                            → Toggle STILL VISIBLE
```

### Why This Matters

The current architecture breaks the advisor workflow:
1. Admin approves advisor → advisor can toggle ON
2. Advisor toggles OFF → `advisor_approved` becomes false
3. Toggle disappears → advisor is permanently hidden (stuck)

The fix ensures:
- Admin approval is a one-time permanent status (until admin revokes)
- Visibility is a self-service toggle the advisor controls
- These two concepts never interfere with each other
