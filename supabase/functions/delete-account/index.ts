// Account deletion (audit SEC-05). Server-side so it can't half-fail in the
// browser, and so it can remove the login and stored files.
//
// What it does for the signed-in caller:
//   1. Refuses while there are upcoming confirmed sessions (cancel first, so
//      refunds run through the normal policy) or unpaid advisor withdrawals.
//   2. Deletes their files in storage (avatars, portfolios, verifications).
//   3. Anonymizes the profile (name, email, bio, photos, links, location).
//   4. Deletes their advisor application/profile rows, roles, waitlist entries.
//   5. Replaces the login email with a non-routable placeholder, sets a random
//      password, and bans the auth user, so they can't sign in again.
// Booking, payment and refund rows are kept (anonymized via the profile)
// because they're needed for accounting and for the other party's records;
// deleting the auth user outright would cascade-delete them.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const BUCKETS = ["avatars", "portfolios", "verifications"];

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "Please sign in again." }, 401);
    const user = userData.user;

    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") return json({ error: "Confirmation required." }, 400);

    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();

    if (profile) {
      // 1. Upcoming confirmed sessions must be cancelled first.
      const { data: upcoming } = await admin
        .from("bookings")
        .select("id, slot:availability_slots!inner(start_time)")
        .or(`client_id.eq.${profile.id},advisor_id.eq.${profile.id}`)
        .eq("status", "confirmed")
        .gt("availability_slots.start_time", new Date().toISOString())
        .limit(1);
      if (upcoming && upcoming.length > 0) {
        return json(
          { error: "You have upcoming sessions. Please cancel them from your dashboard first, then delete your account." },
          409,
        );
      }

      const { data: pendingWithdrawals } = await admin
        .from("withdrawal_requests")
        .select("id")
        .eq("advisor_id", profile.id)
        .in("status", ["pending", "approved"])
        .limit(1);
      if (pendingWithdrawals && pendingWithdrawals.length > 0) {
        return json(
          { error: "You have a withdrawal in progress. Please contact info@cookalook.com so we can pay you out before deleting your account." },
          409,
        );
      }
    }

    // 2. Storage files under <user_id>/ in each bucket.
    for (const bucket of BUCKETS) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${user.id}/${f.name}`);
      if (paths.length) {
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) console.error(`delete-account: storage ${bucket}`, error.message);
      }
    }

    // 3. Anonymize the profile (service role bypasses the privilege trigger).
    if (profile) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          full_name: "Deleted user",
          email: null,
          bio: null,
          avatar_url: null,
          location: null,
          instagram_url: null,
          portfolio_url: null,
          portfolio_images: [],
          personal_philosophy: null,
          specialty: null,
          style_tags: [],
          target_demographics: [],
          languages: [],
          is_advisor: false,
          advisor_approved: false,
        })
        .eq("id", profile.id);
      if (profileError) throw new Error(`profile: ${profileError.message}`);
    }

    // 4. Rows that only exist for this person.
    await admin.from("advisor_applications").delete().eq("user_id", user.id);
    await admin.from("advisor_profiles").delete().eq("user_id", user.id);
    await admin.from("user_roles").delete().eq("user_id", user.id);
    await admin.from("concierge_profiles").delete().eq("user_id", user.id);
    if (user.email) await admin.from("booking_waitlist").delete().eq("email", user.email.toLowerCase());

    // 5. Remove personal data from the login and block it.
    const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
      email: `deleted+${user.id}@deleted.invalid`,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: {},
      ban_duration: "876000h", // ~100 years
    });
    if (banError) throw new Error(`auth: ${banError.message}`);

    console.log("delete-account: completed", user.id);
    return json({ ok: true });
  } catch (e) {
    console.error("delete-account error:", e instanceof Error ? e.message : String(e));
    return json({ error: "We couldn't delete your account. Please contact info@cookalook.com." }, 500);
  }
});
