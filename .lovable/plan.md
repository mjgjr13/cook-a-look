
# Fix Stripe Test Mode & Enable Tax Calculation

## Issues Identified

### Issue 1: Live Stripe Key in Production
The `STRIPE_SECRET_KEY` environment variable is currently set to a **live key** (`sk_live_...`), which causes the error:
> "Your request was in live mode, but used a known test card."

**Resolution**: The Stripe connector manages this secret. You need to update the secret to use a test key (`sk_test_...`) instead.

### Issue 2: Stripe Tax Not Calculating
For Stripe Tax to calculate taxes on dynamic line items with `automatic_tax: { enabled: true }`, you must specify a `tax_code` on the `product_data`. Without a tax code, Stripe cannot determine the product category and falls back to either a preset tax code (if configured in Dashboard) or no tax calculation.

---

## Solution

### Step 1: Update Stripe Secret Key to Test Mode
The `STRIPE_SECRET_KEY` secret needs to be replaced with a test key.

**Action Required (User)**:
1. Go to your Stripe Dashboard → Developers → API Keys
2. Copy your **test mode** secret key (starts with `sk_test_`)
3. Update the `STRIPE_SECRET_KEY` in the Lovable Cloud secrets

### Step 2: Add Tax Code to Dynamic Line Items
Add a `tax_code` to the `product_data` in the checkout session. For virtual styling consultations, the appropriate tax code is `txcd_10000000` (General - Services).

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Add `tax_code: "txcd_10000000"` to `product_data` |

**Code change**:
```typescript
line_items: [
  {
    price_data: {
      currency: "usd",
      product_data: {
        name: `Style Consultation with ${advisorName}`,
        description: `${sessionDate} at ${sessionTime} - Virtual styling session`,
        tax_code: "txcd_10000000", // General - Services
      },
      unit_amount: Math.round(amount * 100),
      tax_behavior: "exclusive",
    },
    quantity: 1,
  },
],
```

---

## Tax Calculation Flow After Fix

```text
┌─────────────────────────────────────────────────────────────┐
│                    CHECKOUT FLOW                            │
├─────────────────────────────────────────────────────────────┤
│  1. Customer clicks "Proceed to Payment"                    │
│  2. Edge function creates checkout with:                    │
│     - automatic_tax.enabled = true                          │
│     - billing_address_collection = required                 │
│     - price_data.tax_behavior = exclusive                   │
│     - product_data.tax_code = txcd_10000000                 │
│  3. Customer enters billing address                         │
│  4. Stripe Tax calculates regional tax based on:            │
│     - Customer's billing address (state/country)            │
│     - Product tax code (Services)                           │
│     - Tax registrations in Stripe Dashboard                 │
│  5. Tax line item appears dynamically                       │
│  6. Customer sees: Subtotal + Tax = Total                   │
│  7. Payment processed with correct tax collected            │
└─────────────────────────────────────────────────────────────┘
```

---

## Stripe Dashboard Prerequisites

For automatic tax to function, ensure in the Stripe Dashboard:

1. **Tax settings enabled**: Dashboard → Settings → Tax
2. **Tax registrations configured**: Add at least one jurisdiction where you collect tax
3. **Test mode active**: Toggle to "Test mode" in Dashboard top bar

---

## Testing Verification

After implementation:
1. Ensure Stripe Dashboard is in **Test mode**
2. Use a test card (e.g., 4242 4242 4242 4242)
3. Enter a billing address in a taxable jurisdiction (e.g., California, USA)
4. Confirm a "Tax" line item appears before payment
5. Complete test payment and verify tax was collected

---

## Technical Notes

- `tax_code: "txcd_10000000"` = General - Services (appropriate for consulting/advisory services)
- Alternative tax codes available at [Stripe Tax Codes](https://docs.stripe.com/tax/tax-codes)
- If no tax registrations are configured in Stripe Dashboard, tax will be $0.00 even with correct code
