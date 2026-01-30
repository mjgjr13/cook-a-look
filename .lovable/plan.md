

# Fix: Create-Checkout Edge Function CORS Headers

## Problem Summary

When clicking "Proceed to Payment" after selecting an advisor time slot, you're getting:
> **Booking Failed: Edge function returned a non-2xx status code**

## Root Cause

The `create-checkout` edge function has **incomplete CORS headers**. The Supabase JavaScript client sends additional headers that are NOT listed in the `Access-Control-Allow-Headers` configuration.

### Current (broken):
```javascript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
```

### Missing headers sent by Supabase client:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

When the browser's preflight (OPTIONS) request checks if these headers are allowed and they're not listed, the CORS check fails silently and returns an error before the actual request is even made.

## Solution

Update the CORS headers in `supabase/functions/create-checkout/index.ts` to include all required headers.

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Update `corsHeaders` to include all Supabase client headers |

## Technical Implementation

### Updated CORS Headers
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

This single-line change will allow the browser to successfully complete the preflight CORS check, enabling the actual POST request to proceed.

## Expected Outcome

After this fix:
- Clicking "Proceed to Payment" will successfully call the edge function
- Users will be redirected to Stripe Checkout to complete their booking payment
- The booking flow will work end-to-end

