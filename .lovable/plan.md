## Enable Stripe Automatic Tax on Checkout

Add Stripe's automatic tax calculation to the `create-checkout` edge function so that the correct sales tax / VAT / GST is computed at checkout based on the customer's billing address.

### What changes

**File:** `supabase/functions/create-checkout/index.ts`

Update the `stripe.checkout.sessions.create(...)` call to:

1. Add `automatic_tax: { enabled: true }` — Stripe calculates tax based on the customer's address.
2. Add `billing_address_collection: "required"` — ensures the customer enters a billing address so tax can be computed accurately (IP geolocation is not reliable enough; Stripe Tax requires an address).
3. Add `customer_update: { address: "auto", name: "auto" }` when a `customer` is passed, so Stripe saves/updates the address on the customer record (required when `automatic_tax` is on with an existing customer).
4. Add a `tax_code` to the `price_data.product_data` — use `txcd_20030000` (Personal services — professional services), appropriate for styling consultations. This tells Stripe how to tax the service in each jurisdiction.

No other files change. The booking record, surcharge handling, success/cancel URLs, and metadata stay the same.

### Important caveats to flag to the user

- **Tax registrations required.** Stripe will calculate tax everywhere, but it only *collects* tax in jurisdictions where you've added a registration in the Stripe Dashboard (Tax → Registrations). Until you register (e.g., your home Canadian province for GST/HST, plus any US states where you cross nexus), Stripe will show $0 tax to those buyers.
- **Stripe Tax has a per-transaction fee** (0.5% of the transaction in registered jurisdictions). This is billed by Stripe on top of normal processing fees.
- **You're still responsible for remitting tax** to each tax authority. Stripe calculates and collects only — filing is on you (or via a third party like TaxJar/Avalara).
- **Total amount shown to clients will increase** by the tax amount at checkout. Your advisor payout math (15%/5% platform fee on the pre-tax amount) is unaffected because the Stripe line item `unit_amount` stays the same — tax is added on top by Stripe.

### Technical detail

```ts
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  ...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
  billing_address_collection: "required",
  automatic_tax: { enabled: true },
  line_items: [{
    price_data: {
      currency: "usd",
      product_data: {
        name: `Style Consultation with ${advisorName}`,
        description: descriptionParts.join(" — "),
        tax_code: "txcd_20030000", // Personal/professional services
      },
      unit_amount: Math.round(amount * 100),
    },
    quantity: 1,
  }],
  mode: "payment",
  success_url: ...,
  cancel_url: ...,
  metadata: { ... },
});
```

After deploy: go to Stripe Dashboard → Tax → enable Stripe Tax and add at least one registration (your home jurisdiction) so collection actually happens.