/**
 * Google sign-in. Keep false until Google OAuth "Your own credentials" (client
 * ID + secret) are saved in Lovable Cloud > Users > Auth > Google - until then
 * Supabase rejects Google sign-in with "missing OAuth secret".
 * Check with: curl -s "https://chjmyzzczwattluqpbat.supabase.co/auth/v1/authorize?provider=google"
 * (a redirect to accounts.google.com means it's ready; a JSON error means not yet).
 */
export const GOOGLE_SIGN_IN_ENABLED = false;
