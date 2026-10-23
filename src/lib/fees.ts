// Advisor platform fee: one flat rate on every booking. Pricing is not final
// (a monthly plan may be added), so all fee copy and maths read from here.
// The server charges the same rate in supabase/functions/_shared/fees.ts;
// change both together.
export const PLATFORM_FEE_PERCENT = 15;

/** What the advisor receives from a session price, after the platform fee. */
export const advisorShare = (sessionPrice: number) =>
  Math.round(sessionPrice * (100 - PLATFORM_FEE_PERCENT)) / 100;

/** "Cook A Look charges a 15% platform fee per booking. On a $100 session, you receive $85." */
export const PLATFORM_FEE_SUMMARY =
  `Cook A Look charges a ${PLATFORM_FEE_PERCENT}% platform fee per booking. ` +
  `On a $100 session, you receive $${advisorShare(100)}.`;
