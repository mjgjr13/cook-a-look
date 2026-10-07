// Security regression checks (audit 2026-10-04). Run: npm run test:security
//
// 1. Unit checks for safeExternalUrl (stored-XSS link filter).
// 2. Live, READ-ONLY permission checks against the Supabase project using only
//    the public (anon) key: privileged RPCs must be denied and private tables
//    must return no rows. Uses random UUIDs / non-existent queue names, never
//    writes data, and never reads real email queues.
import { safeExternalUrl } from "../src/lib/safeUrl";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qdpqfsqjtbvlulekfhoy.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcHFmc3FqdGJ2bHVsZWtmaG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzgyODksImV4cCI6MjA4NTAxNDI4OX0.Rqw-1Lx1Uo5Ar8stFQv4fPE7OkmAlamz21T3BAZocPw";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

// --- 1. safeExternalUrl ------------------------------------------------------
const blocked = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "  javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "mailto:a@b.com", ""];
for (const v of blocked) check(`safeExternalUrl blocks ${JSON.stringify(v)}`, safeExternalUrl(v) === null);
check("safeExternalUrl allows https", safeExternalUrl("https://ok.com/a") === "https://ok.com/a");
check("safeExternalUrl upgrades bare domain", safeExternalUrl("example.com/me") === "https://example.com/me");

// --- 2. Live permission checks (anon) ------------------------------------------
const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" };
const randomId = () => crypto.randomUUID();

const rpc = async (fn: string, body: unknown) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const denied = (res: { status: number; body: { code?: string } | null }) =>
  res.body?.code === "42501" || res.status === 401 || res.status === 403;

const mustDeny: Array<[string, unknown]> = [
  ["confirm_paid_booking", { p_booking_id: randomId(), p_client_id: randomId() }],
  ["mark_refund_result", { p_booking_id: randomId(), p_status: "none" }],
  ["cancel_booking", { p_booking_id: randomId() }],
  ["calculate_refund", { p_booking_id: randomId(), p_canceller: "client" }],
  ["complete_due_bookings", {}],
  ["award_client_points", { _user_id: randomId(), _action_type: "x", _points: 1 }],
  ["redeem_site_credits", { _user_id: randomId(), _amount_cents: 1 }], // SEC-02
  ["read_email_batch", { queue_name: "security_check_nonexistent", batch_size: 1, vt: 0 }], // SEC-01 (read-only probe)
  ["delete_email", { queue_name: "security_check_nonexistent", message_id: 1 }], // SEC-01
  ["get_all_advisor_profiles_including_demo", {}], // SEC-09
];

const privateTables = [
  "profiles", "bookings", "payments", "booking_messages", "video_sessions", "advisor_applications",
  "user_roles", "withdrawal_requests", "refund_events", "disputes", "booking_waitlist", "admin_messages",
  "email_send_log", "suppressed_emails", "email_unsubscribe_tokens", "site_credits_log", "user_rewards",
];

const main = async () => {
  for (const [fn, body] of mustDeny) {
    const res = await rpc(fn, body);
    check(`anon cannot call ${fn}`, denied(res), denied(res) ? "" : `HTTP ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
  }
  for (const t of privateTables) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`, { headers });
    const rows = await r.json().catch(() => null);
    const ok = !Array.isArray(rows) || rows.length === 0;
    check(`anon reads no rows from ${t}`, ok, ok ? "" : `${rows.length} row(s) visible`);
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll security checks passed");
  process.exit(failures ? 1 : 0);
};

main();
