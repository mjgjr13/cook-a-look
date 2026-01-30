# COMPLETED: Fix Visibility Toggle Always Remains Accessible for Approved Advisors

## Status: ✅ Implemented

## Changes Made

### 1. `src/hooks/useAdvisorProfile.ts`
- **Removed** the code block (lines 192-206) that was incorrectly updating `profiles.advisor_approved` when visibility was toggled
- Now `toggleVisibility` only updates `advisor_profiles.is_listed` without touching the approval status

### 2. `src/hooks/useProfile.ts`
- **Updated** role detection to fetch `advisor_profiles.application_status` in parallel with other queries
- `isApprovedAdvisor` is now determined by `application_status === 'approved'` instead of `profiles.advisor_approved`
- This ensures admin approval status is independent of visibility toggle

## Result
- Admin approval (`application_status`) remains unchanged when advisor toggles visibility
- Visibility toggle remains accessible on Dashboard and Settings even when turned OFF
- Advisors can freely toggle their public listing on/off
- Public `/advisors` page correctly shows only advisors with `is_listed = true`
