// Shared CORS configuration for edge functions
// This provides origin-restricted CORS instead of wildcard to improve security

// Allowed origins for CORS - production and development environments
const ALLOWED_ORIGINS = [
  "https://cookalook.lovable.app",
  "https://cookalookcom.lovable.app",
  "https://id-preview--1c46abdc-cec7-4209-a14b-719c7e387fb4.lovable.app",
  "https://1c46abdc-cec7-4209-a14b-719c7e387fb4.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

/**
 * Get CORS headers with origin validation
 * Falls back to first allowed origin if request origin is not in the allowlist
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, { headers: getCorsHeaders(origin) });
  }
  return null;
}
