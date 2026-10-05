/**
 * Google sign-in. Keep false until Google OAuth "Your own credentials" (client
 * ID + secret) are saved in Lovable Cloud > Users > Auth > Google - until then
 * Supabase rejects Google sign-in with "missing OAuth secret".
 * Check with: curl -s "https://chjmyzzczwattluqpbat.supabase.co/auth/v1/authorize?provider=google"
 * (a redirect to accounts.google.com means it's ready; a JSON error means not yet).
 */
export const GOOGLE_SIGN_IN_ENABLED = false;

/**
 * Treat the designated test advisor (James Whitaker, see
 * TEST_BOOKABLE_SAMPLE_ADVISOR_IDS) as a real advisor: bookable by anyone,
 * reviews and ratings shown, no "Sample profile" label. For end-to-end testing
 * while Stripe is in TEST mode. Set to false before launch; create-checkout
 * also refuses him automatically once Stripe uses live keys.
 */
export const TEST_ADVISOR_ACTS_AS_REAL = true;

/**
 * Path of the reviews/testimonials page. When set (e.g. "/reviews"), the
 * "Leave confident, with a plan" step on the homepage links to it.
 * Leave null until that page exists and has real reviews.
 */
export const REVIEWS_PAGE_PATH: string | null = null;
