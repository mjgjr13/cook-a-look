// Advisor platform fee: one flat rate on every booking, as a percentage of the
// session price (tax and any client booking fee excluded). Stripe processing
// fees come out of the platform's share, not the advisor's.
// The website shows the same rate from src/lib/fees.ts; change both together.
export const PLATFORM_FEE_PERCENT = 15;
