import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Scheduled maintenance job - deletes advisor identity-verification photos
// (selfie + government ID) once they're past the retention schedule
// published at /privacy#biometric-data. Not user-facing: invoked by a
// pg_cron job (see supabase/migrations/20260704010000_...sql) using the
// vault-stored service_role key.
// verify_jwt=true at the gateway already requires a valid JWT; the explicit
// role check below is defense in depth so only service-role callers
// (i.e. the cron job, not a logged-in user) can trigger deletion.
//
// Retention rules (must stay in sync with the Privacy Policy):
//   - Denied applications: photos deleted 30 days after the denial
//     (reviewed_at), giving a short window for an appeal.
//   - Any application (pending or approved): photos deleted 1 year after
//     the application was created, which is the hard cap regardless of
//     status per 740 ILCS 14/15(a)-style "3 years or purpose satisfied,
//     whichever is first" - we use 1 year as our own stricter commitment.
//   - Applications whose account was deleted (user_id is null, since
//     advisor_applications.user_id is ON DELETE SET NULL): photos deleted
//     immediately, since there's no remaining account to verify.

const DENIED_GRACE_DAYS = 30;
const MAX_RETENTION_DAYS = 365;

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface ApplicationRow {
  id: string;
  user_id: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  selfie_storage_path: string | null;
  id_document_storage_path: string | null;
}

serve(async (req) => {
  const pre = handleCorsPreflightRequest(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req.headers.get("origin"));
  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const claims = parseJwtClaims(authHeader.slice("Bearer ".length).trim());
    if (claims?.role !== "service_role") {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: jsonHeaders });
    }

    const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase credentials not configured");
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const now = Date.now();
    const deniedCutoff = new Date(now - DENIED_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const maxRetentionCutoff = new Date(now - MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Candidate rows: not yet processed, and with at least one photo path on file.
    const { data: candidates, error: fetchErr } = await admin
      .from("advisor_applications")
      .select("id, user_id, status, created_at, reviewed_at, selfie_storage_path, id_document_storage_path")
      .is("verification_photos_deleted_at", null)
      .or("selfie_storage_path.not.is.null,id_document_storage_path.not.is.null")
      .limit(500);

    if (fetchErr) {
      console.error("Failed to fetch candidates:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: jsonHeaders });
    }

    const eligible = (candidates ?? []).filter((row: ApplicationRow) => {
      if (row.user_id === null) return true; // account deleted
      if (row.status === "denied" && row.reviewed_at && row.reviewed_at < deniedCutoff) return true;
      if (row.created_at < maxRetentionCutoff) return true;
      return false;
    });

    let deletedRows = 0;
    let deletedObjects = 0;
    const errors: { id: string; error: string }[] = [];

    for (const row of eligible as ApplicationRow[]) {
      const paths = [row.selfie_storage_path, row.id_document_storage_path].filter(
        (p): p is string => !!p,
      );

      if (dryRun) {
        deletedRows++;
        deletedObjects += paths.length;
        continue;
      }

      if (paths.length > 0) {
        const { error: removeErr } = await admin.storage.from("verifications").remove(paths);
        if (removeErr) {
          console.error(`Failed to remove storage objects for application ${row.id}:`, removeErr);
          errors.push({ id: row.id, error: removeErr.message });
          continue; // don't mark as deleted if the object removal failed
        }
        deletedObjects += paths.length;
      }

      const { error: updateErr } = await admin
        .from("advisor_applications")
        .update({
          selfie_url: null,
          id_document_url: null,
          selfie_storage_path: null,
          id_document_storage_path: null,
          verification_photos_deleted_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateErr) {
        console.error(`Failed to clear application ${row.id} after deletion:`, updateErr);
        errors.push({ id: row.id, error: updateErr.message });
        continue;
      }

      deletedRows++;
    }

    return new Response(
      JSON.stringify({
        dryRun,
        candidatesScanned: candidates?.length ?? 0,
        eligible: eligible.length,
        applicationsProcessed: deletedRows,
        objectsDeleted: deletedObjects,
        errors,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error("delete-expired-verifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
