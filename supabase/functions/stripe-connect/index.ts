import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, getSafeOrigin, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Advisor payouts via Stripe Connect (Express accounts).
//   { action: "onboard", country: "US" | "CA" } -> { url }  Stripe-hosted onboarding
//   { action: "status" }                        -> current payout account state
//   { action: "dashboard" }                     -> { url }  Stripe Express dashboard login
// The platform (Cook A Look) charges clients; release-advisor-payouts later
// transfers each advisor's share to their account.

const SUPPORTED_COUNTRIES = ["US", "CA"];
// Cook A Look's Stripe account is in Canada. Canadian advisors get a full
// account; advisors elsewhere receive transfers under the recipient agreement.
const PLATFORM_COUNTRY = "CA";

type Admin = ReturnType<typeof createClient>;

const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function syncAccount(admin: Admin, stripe: Stripe, advisorId: string, accountId: string) {
  const acct = await stripe.accounts.retrieve(accountId);
  const row = {
    details_submitted: !!acct.details_submitted,
    payouts_enabled: !!acct.payouts_enabled,
    transfers_active: acct.capabilities?.transfers === "active",
    requirements_due: (acct.requirements?.currently_due ?? []).length,
    updated_at: new Date().toISOString(),
  };
  await admin.from("advisor_payout_accounts").update(row).eq("advisor_id", advisorId);
  return { connected: true, country: acct.country, ...row };
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Payments are not configured" }, cors, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated" }, cors, 401);
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "Not authenticated" }, cors, 401);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, is_advisor, full_name")
      .eq("user_id", user.id)
      .single();
    if (!profile?.is_advisor) return json({ error: "Only advisors can set up payouts" }, cors, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    const { data: existing } = await admin
      .from("advisor_payout_accounts")
      .select("stripe_account_id, country")
      .eq("advisor_id", profile.id)
      .maybeSingle();

    if (action === "status") {
      if (!existing) return json({ connected: false }, cors);
      return json(await syncAccount(admin, stripe, profile.id, existing.stripe_account_id), cors);
    }

    if (action === "dashboard") {
      if (!existing) return json({ error: "Set up payouts first" }, cors, 400);
      const link = await stripe.accounts.createLoginLink(existing.stripe_account_id);
      return json({ url: link.url }, cors);
    }

    if (action === "onboard") {
      let accountId = existing?.stripe_account_id;
      if (!accountId) {
        const country = String(body?.country ?? "").toUpperCase();
        if (!SUPPORTED_COUNTRIES.includes(country)) return json({ error: "Choose the country where you'll be paid" }, cors, 400);
        const sameCountry = country === PLATFORM_COUNTRY;
        const account = await stripe.accounts.create(
          {
            country,
            email: user.email ?? undefined,
            controller: {
              stripe_dashboard: { type: "express" },
              fees: { payer: "application" },
              losses: { payments: "application" },
            },
            capabilities: { transfers: { requested: true } },
            ...(sameCountry ? {} : { tos_acceptance: { service_agreement: "recipient" } }),
            business_profile: {
              product_description: "Personal styling sessions booked through Cook A Look",
              url: "https://cookalook.com",
            },
            metadata: { advisor_id: profile.id },
          },
          { idempotencyKey: `connect-account-${profile.id}` },
        );
        accountId = account.id;
        const { error: insertError } = await admin.from("advisor_payout_accounts").insert({
          advisor_id: profile.id,
          stripe_account_id: accountId,
          country,
        });
        if (insertError) throw insertError;
      }

      const base = getSafeOrigin(origin);
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${base}/advisor/earnings?payouts=refresh`,
        return_url: `${base}/advisor/earnings?payouts=return`,
      });
      return json({ url: link.url }, cors);
    }

    return json({ error: "Unknown action" }, cors, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("stripe-connect error:", msg);
    return json({ error: msg }, cors, 500);
  }
});
