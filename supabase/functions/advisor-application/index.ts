import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { SITE_URL, button, detailRows, escapeHtml, heading, paragraph, renderEmail, sendEmail } from "../_shared/emailLayout.ts";

// Saves an advisor application from the Become an Advisor page.
//
// Works both for someone already signed in and for someone who has JUST
// created their account and hasn't confirmed their email yet (sign-up returns
// no session until they confirm). Before, that second case threw the whole
// application away and left a plain client account.
//
// A not-yet-confirmed caller is accepted only if the account: exists, matches
// the email given, is unconfirmed, was created in the last hour, was created
// from the advisor page (user_metadata.signup_intent = "advisor") and has no
// application yet.
//
//   { action: "prepare", pendingUserId?, email, files: [{ kind: "avatar"|"selfie"|"id", ext }] }
//       -> signed upload URLs for each file (the browser uploads directly to storage)
//   { action: "submit", pendingUserId?, email, profile, application, paths, dateOfBirth }
//       -> marks the profile as a pending advisor, records the application, emails the admin

type Admin = ReturnType<typeof createClient>;
const json = (body: unknown, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Profile fields an applicant may set. Approval flags are always forced below.
const PROFILE_FIELDS = [
  "full_name", "bio", "instagram_url", "virtual_available", "in_person_available", "location",
  "experience_years", "price_per_session", "languages", "style_tags", "target_demographics", "use_cases",
  "offers_corporate", "corporate_services", "corporate_industries", "corporate_virtual_rate", "corporate_in_person_rate",
];
const APPLICATION_FIELDS = [
  "first_name", "last_name", "phone", "specialty", "experience", "bio", "virtual", "in_person",
  "instagram", "tiktok", "linkedin", "portfolio",
];
const pick = (src: Record<string, unknown> | undefined, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => src && k in src).map((k) => [k, src![k]]));

const EXT_OK = /^(jpg|jpeg|png|webp|heic)$/;

async function resolveUser(req: Request, admin: Admin, body: Record<string, unknown>) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token) {
    const { data } = await admin.auth.getUser(token);
    if (data?.user) return { id: data.user.id, email: (data.user.email ?? "").toLowerCase(), confirmed: true };
  }
  const pendingUserId = String(body.pendingUserId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(pendingUserId) || !email) return null;
  const { data, error } = await admin.auth.admin.getUserById(pendingUserId);
  const u = data?.user;
  if (error || !u) return null;
  const ageMs = Date.now() - new Date(u.created_at).getTime();
  if ((u.email ?? "").toLowerCase() !== email) return null;
  if (u.email_confirmed_at) return null; // confirmed accounts must sign in
  if (ageMs > 60 * 60 * 1000) return null;
  if ((u.user_metadata as Record<string, unknown> | undefined)?.signup_intent !== "advisor") return null;
  return { id: u.id, email, confirmed: false };
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const cors = getCorsHeaders(req.headers.get("origin"));

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const user = await resolveUser(req, admin, body);
    if (!user) return json({ error: "Please sign in to continue your application." }, cors, 401);

    const { data: existing } = await admin
      .from("advisor_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return json({ error: existing.status === "approved" ? "Your application has already been approved." : "You've already applied. We'll be in touch soon." }, cors, 409);
    }

    if (body.action === "prepare") {
      const files = Array.isArray(body.files) ? (body.files as { kind?: string; ext?: string }[]).slice(0, 3) : [];
      const out: Record<string, { bucket: string; path: string; token: string }> = {};
      for (const f of files) {
        const kind = f.kind === "avatar" || f.kind === "selfie" || f.kind === "id" ? f.kind : null;
        const ext = String(f.ext ?? "jpg").toLowerCase();
        if (!kind || !EXT_OK.test(ext)) continue;
        const bucket = kind === "avatar" ? "avatars" : "verifications";
        const path = `${user.id}/${kind === "avatar" ? "avatar" : kind}_${Date.now()}.${ext}`;
        const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
        if (error || !data) throw new Error(`Couldn't prepare the ${kind} upload`);
        out[kind] = { bucket, path, token: data.token };
      }
      return json({ uploads: out }, cors);
    }

    if (body.action !== "submit") return json({ error: "Unknown action" }, cors, 400);

    const paths = (body.paths ?? {}) as Record<string, string | undefined>;
    const own = (p?: string) => (p && p.startsWith(`${user.id}/`) && !p.includes("..") ? p : null);
    const avatarPath = own(paths.avatar);
    const selfiePath = own(paths.selfie);
    const idPath = own(paths.id);
    if (!selfiePath || !idPath) return json({ error: "Your verification photos are missing. Please add them and try again." }, cors, 400);

    const profileIn = pick(body.profile as Record<string, unknown>, PROFILE_FIELDS);
    const profileUpdate: Record<string, unknown> = {
      ...profileIn,
      is_advisor: true,
      advisor_approved: false,
      advisor_status: "pending",
    };
    if (avatarPath) {
      profileUpdate.avatar_url = admin.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
    }

    // The sign-up trigger creates the profile row; give it a moment if needed.
    let profileRow: { id: string } | null = null;
    for (let i = 0; i < 6 && !profileRow; i++) {
      const { data } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      profileRow = data as { id: string } | null;
      if (!profileRow) await new Promise((r) => setTimeout(r, 500));
    }
    if (profileRow) {
      const { error } = await admin.from("profiles").update(profileUpdate).eq("user_id", user.id);
      if (error) throw new Error("Couldn't set up your advisor profile");
    } else {
      const { error } = await admin.from("profiles").insert({ ...profileUpdate, user_id: user.id, email: user.email });
      if (error) throw new Error("Couldn't create your advisor profile");
    }

    const appIn = pick(body.application as Record<string, unknown>, APPLICATION_FIELDS);
    const dob = typeof body.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) ? body.dateOfBirth : null;
    const { error: appError } = await admin.from("advisor_applications").insert({
      ...appIn,
      user_id: user.id,
      email: user.email,
      status: "pending",
      liveness_verified: true,
      selfie_url: selfiePath,
      id_document_url: idPath,
      selfie_storage_path: selfiePath,
      id_document_storage_path: idPath,
      ...(dob ? { date_of_birth: dob } : {}),
    });
    if (appError) {
      console.error("application insert failed", appError.message);
      throw new Error(/18/.test(appError.message) ? "Advisors must be 18 or older." : "Couldn't save your application");
    }

    // Tell the admin (best effort).
    try {
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      if (adminEmail) {
        const name = `${String(appIn.first_name ?? "").trim()} ${String(appIn.last_name ?? "").trim()}`.trim() || user.email;
        await sendEmail({
          to: adminEmail,
          subject: `New advisor application: ${name}`,
          html: renderEmail({
            title: "New advisor awaiting approval",
            preheader: `${name} applied to be a Style Advisor.`,
            body: [
              heading("New advisor awaiting approval"),
              paragraph(`<strong>${escapeHtml(name)}</strong> has submitted an advisor application.`),
              detailRows([
                ["Email", escapeHtml(user.email)],
                ["Specialty", escapeHtml(String(appIn.specialty ?? ""))],
                ["Email confirmed", user.confirmed ? "Yes" : "Not yet (they've been sent the link)"],
              ]),
              button("Review in admin", `${SITE_URL}/admin/advisors`),
            ].join(""),
          }),
        });
      }
    } catch (e) {
      console.error("admin notify failed", e instanceof Error ? e.message : e);
    }

    return json({ ok: true, confirmed: user.confirmed }, cors);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("advisor-application error:", msg);
    return json({ error: msg }, cors, 500);
  }
});
