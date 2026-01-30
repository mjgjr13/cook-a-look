
# Enable Full Stripe Tax Calculation for Dynamic Pricing

## Current State Analysis

The checkout function already has:
- `automatic_tax: { enabled: true }` ✅
- `billing_address_collection: "required"` ✅  
- Dynamic pricing via `price_data` ✅

## Missing Configuration

For Stripe Tax to calculate taxes on dynamic line items, **`tax_behavior` must be explicitly set** on the `price_data`. Without this, Stripe cannot determine whether the price is tax-inclusive or tax-exclusive, and tax calculation will not work.

## Solution

Update the `price_data` object to include `tax_behavior: "exclusive"`, which tells Stripe:
- The displayed price does NOT include tax
- Tax should be calculated and added on top of the base price
- The customer sees the tax as a separate line item before payment

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Add `tax_behavior: "exclusive"` to `price_data` |

## Code Change

```typescript
line_items: [
  {
    price_data: {
      currency: "usd",
      product_data: {
        name: `Style Consultation with ${advisorName}`,
        description: `${sessionDate} at ${sessionTime} - Virtual styling session`,
      },
      unit_amount: Math.round(amount * 100),
      tax_behavior: "exclusive", // Price excludes tax; tax calculated separately
    },
    quantity: 1,
  },
],
```

## How Stripe Tax Works After This Change

```text
┌─────────────────────────────────────────────────────────────┐
│                    CHECKOUT FLOW                            │
├─────────────────────────────────────────────────────────────┤
│  1. Customer clicks "Proceed to Payment"                    │
│  2. Stripe Checkout loads with base price ($150)            │
│  3. Customer enters billing address (required)              │
│  4. Stripe Tax API calculates regional tax based on:        │
│     - Customer's billing address (state/country)            │
│     - Product type (digital service)                        │
│     - Tax nexus configuration in Stripe Dashboard           │
│  5. Tax amount appears as separate line item                │
│  6. Customer sees: Subtotal + Tax = Total                   │
│  7. Payment processed with correct tax collected            │
└─────────────────────────────────────────────────────────────┘
```

## Stripe Dashboard Requirements

For automatic tax to function, ensure in the Stripe Dashboard:
1. **Tax settings enabled** at Dashboard → Settings → Tax
2. **Tax registrations configured** for jurisdictions where you collect tax
3. **Product tax codes** (optional) - defaults to "General - Electronically Supplied Services"

## Testing Verification

After implementation, test in Stripe test mode:
1. Go through booking flow and reach Stripe Checkout
2. Enter a billing address (e.g., California, USA or a European country)
3. Confirm that a "Tax" line item appears and updates based on address
4. Complete test payment and verify tax was collected in Stripe Dashboard

## Technical Notes

- `tax_behavior: "exclusive"` = Price shown + tax added on top (most common for US)
- `tax_behavior: "inclusive"` = Price shown already includes tax (common in EU)
- Using "exclusive" ensures transparent pricing where customers see the base consultation fee plus applicable tax
