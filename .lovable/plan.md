
# Fix: Admin Advisor Management Zero Count Issue

## Problem Summary

The Admin Advisor Management page shows "0 Active Advisors" because of a data synchronization gap between two tables:

| Table | Records | Problem |
|-------|---------|---------|
| `profiles` | 5 advisors with `is_advisor = true` | All 5 have `advisor_approved = true` or `is_advisor = true` |
| `advisor_profiles` | Only 1 record | 4 advisors missing their `advisor_profiles` records |

The admin page logic requires `advisor_profiles.is_listed = true` to count as "Active", but 4 advisors have no `advisor_profiles` record at all (resulting in `is_listed = undefined/false`).

**Note:** The public Style Advisors page (`/advisors`) works correctly because it uses `get_public_advisor_profiles()` which only checks `profiles.advisor_approved = true`.

---

## Solution: Two-Part Fix

### Part 1: Backfill Missing Data

Create `advisor_profiles` records for the 4 existing advisors who are missing them:

```sql
INSERT INTO advisor_profiles (user_id, application_status, is_listed, onboarding_status)
SELECT 
  p.user_id,
  'approved',
  true,  -- List them publicly
  'complete'
FROM profiles p
LEFT JOIN advisor_profiles ap ON p.user_id = ap.user_id
WHERE p.is_advisor = true 
  AND p.advisor_approved = true
  AND ap.user_id IS NULL;
```

### Part 2: Fix Frontend Logic

Update AdminAdvisors.tsx to handle missing `advisor_profiles` records gracefully by treating advisors with `advisor_approved = true` in `profiles` as "active" even if they lack an `advisor_profiles` record.

**Current logic (lines 169-179):**
```typescript
const enrichedAdvisors = (profiles || []).map(p => {
  const ap = advisorProfileMap.get(p.user_id);
  return {
    ...p,
    is_listed: ap?.is_listed ?? false,  // ❌ Defaults to false if no record
    application_status: ap?.application_status ?? "pending",
  };
});
```

**Fixed logic:**
```typescript
const enrichedAdvisors = (profiles || []).map(p => {
  const ap = advisorProfileMap.get(p.user_id);
  return {
    ...p,
    // If advisor_approved in profiles and no advisor_profiles record,
    // treat as listed (legacy data compatibility)
    is_listed: ap?.is_listed ?? (p.advisor_approved === true),
    application_status: ap?.application_status ?? 
      (p.advisor_approved ? "approved" : "pending"),
  };
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| **Database migration** | Backfill missing `advisor_profiles` records |
| `src/pages/admin/AdminAdvisors.tsx` | Update fallback logic for missing `advisor_profiles` |

---

## Expected Outcome

After these changes:
- Admin Advisors page will show 4 "Active Advisors" (those with `advisor_approved = true`)
- The count badge will correctly reflect visible advisors
- Future advisors will have proper `advisor_profiles` records created during onboarding

---

## Technical Details

### Why This Happened

The `advisor_profiles` table was added after the initial advisor system was built. The existing 4 approved advisors in `profiles` were created before this table existed, so they lack corresponding `advisor_profiles` records.

### Prevention

The advisor approval flow (lines 239-251 in AdminAdvisors.tsx) already creates/upserts `advisor_profiles` records for newly approved advisors. This fix addresses legacy data only.
