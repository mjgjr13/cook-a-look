// Test-mode helpers. Designated sample advisors can be booked end to end
// (checkout + video) while Stripe uses TEST keys, so the whole flow can be
// tested before real advisors exist. Switching STRIPE_SECRET_KEY to a live key
// disables all of this automatically.
// Keep TEST_BOOKABLE_SAMPLE_ADVISOR_IDS in sync with src/lib/sampleAdvisors.ts.

export const TEST_BOOKABLE_SAMPLE_ADVISOR_IDS = ["d5717c49-9c09-49d5-b2ee-34b138f6be04"]; // James Whitaker

export const isStripeTestMode = (): boolean => {
  const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
};

/** True for a designated test advisor while Stripe is in test mode. */
export const isTestBookableAdvisor = (advisorId: string | null | undefined): boolean =>
  !!advisorId && isStripeTestMode() && TEST_BOOKABLE_SAMPLE_ADVISOR_IDS.includes(advisorId);
