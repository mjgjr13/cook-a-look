import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Login-free client for public data (advisor listings, profiles, reviews, open
// times). It never reads or refreshes the saved session, so public pages don't
// wait on the auth lock. Safari can leave that lock held by a frozen background
// tab, which made every request wait 10s and fail ("No featured advisors").
// Use the regular `supabase` client for anything that needs the signed-in user.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://qdpqfsqjtbvlulekfhoy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFmc3FqdGJ2bHVsZWtmaG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzgyODksImV4cCI6MjA4NTAxNDI4OX0.Rqw-1Lx1Uo5Ar8stFQv4fPE7OkmAlamz21T3BAZocPw";

export const publicSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "sb-cal-public",
    // No session to protect, so no cross-tab lock is needed.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
