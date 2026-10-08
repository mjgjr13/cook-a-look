// Shared layout for every Cook A Look email.
//
// Email clients (Gmail especially) strip <style> blocks and ignore flex/grid,
// so everything here is table-based with inline styles. The <style> block is
// only a progressive enhancement for clients that keep it (Apple Mail etc.).

export const SITE_URL = "https://www.cookalook.com";
export const FROM_EMAIL = "Cook A Look <notify@cookalook.com>";
export const DEFAULT_TIMEZONE = "America/Toronto";

const LOGO_URL = `${SITE_URL}/brand/cook-a-look-logo-512.png`;

export const HEADING_FONT = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
export const BODY_FONT = "Manrope, Helvetica, Arial, sans-serif";

const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const DIVIDER = "#ece8e1";
const CREAM = "#FAF8F5";

export const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---------- Time zones ----------

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** First valid zone from the candidates, else America/Toronto. */
export function pickTimeZone(...candidates: unknown[]): string {
  for (const c of candidates) if (isValidTimeZone(c)) return c;
  return DEFAULT_TIMEZONE;
}

/** "Thursday, October 8, 2026" in the given zone. */
export function formatDate(iso: string | Date, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/** "10:00 AM EDT" in the given zone. */
export function formatTime(iso: string | Date, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

/** "Thursday, October 8, 2026 at 10:00 AM EDT" */
export function formatDateTime(iso: string | Date, timeZone: string): string {
  return `${formatDate(iso, timeZone)} at ${formatTime(iso, timeZone)}`;
}

/** "Thursday" in the given zone. */
export function formatWeekday(iso: string | Date, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone, weekday: "long" });
}

// ---------- Building blocks (all return inline-styled HTML) ----------

export function paragraph(html: string, opts: { muted?: boolean; center?: boolean; small?: boolean } = {}) {
  const color = opts.muted ? MUTED : INK;
  const size = opts.small ? 13 : 15;
  const align = opts.center ? "center" : "left";
  return `<p style="margin:0 0 16px;font-family:${BODY_FONT};font-size:${size}px;line-height:1.6;color:${color};text-align:${align};">${html}</p>`;
}

export function heading(text: string) {
  return `<h1 style="margin:0 0 24px;font-family:${HEADING_FONT};font-size:30px;line-height:1.2;font-weight:500;color:${INK};text-align:center;">${text}</h1>`;
}

export function subheading(text: string) {
  return `<h2 style="margin:24px 0 12px;font-family:${HEADING_FONT};font-size:21px;line-height:1.3;font-weight:500;color:${INK};">${text}</h2>`;
}

/** Two-column label/value table with light dividers. Values are HTML (escape them first). */
export function detailRows(rows: Array<[string, string]>) {
  const cells = rows
    .map(([label, value], i) => {
      const border = i < rows.length - 1 ? `border-bottom:1px solid ${DIVIDER};` : "";
      return `<tr>
        <td valign="top" style="padding:12px 16px 12px 0;${border}font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${MUTED};white-space:nowrap;width:30%;">${escapeHtml(label)}</td>
        <td valign="top" style="padding:12px 0;${border}font-family:${BODY_FONT};font-size:14px;line-height:1.5;color:${INK};font-weight:600;text-align:right;">${value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;background:${CREAM};border-collapse:separate;">
    <tr><td style="padding:8px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${cells}</table>
    </td></tr>
  </table>`;
}

/** Bulletproof button: a table cell carries the background, so it never splits or wraps. */
export function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
    <tr><td align="center" bgcolor="${INK}" style="background:${INK};">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${BODY_FONT};font-size:13px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;white-space:nowrap;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

/** Bordered quote box (e.g. a chat message preview). Content is HTML. */
export function callout(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
    <tr><td style="padding:16px 20px;background:${CREAM};border-left:3px solid #8b7355;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:#444444;font-style:italic;">${html}</td></tr>
  </table>`;
}

/** Bulleted list without relying on <ul> margins. Items are HTML. */
export function list(items: string[]) {
  const rows = items
    .map((item) => `<tr>
      <td valign="top" style="padding:0 10px 10px 0;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:#8b7355;">&#8226;</td>
      <td valign="top" style="padding:0 0 10px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${INK};">${item}</td>
    </tr>`)
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${rows}</table>`;
}

export function link(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="color:${INK};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

// ---------- Page ----------

export function renderEmail({ title, preheader, body, footer }: {
  /** Used for <title>; not shown in the body. */
  title: string;
  /** Inbox preview text. */
  preheader?: string;
  /** Inner HTML built from the helpers above. */
  body: string;
  /** Optional extra footer line (HTML). */
  footer?: string;
}) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>
  @media only screen and (max-width: 480px) {
    .cal-card { padding: 28px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CREAM};-webkit-text-size-adjust:100%;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CREAM}" style="background:${CREAM};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td align="center" style="padding:0 0 24px;">
        <a href="${SITE_URL}" target="_blank" style="text-decoration:none;">
          <img src="${LOGO_URL}" width="180" alt="Cook A Look" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;font-family:${HEADING_FONT};font-size:22px;letter-spacing:2px;color:${INK};">
        </a>
      </td></tr>
      <tr><td class="cal-card" bgcolor="#ffffff" style="background:#ffffff;padding:40px 36px;">
        ${body}
      </td></tr>
      <tr><td align="center" style="padding:24px 16px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${MUTED};">
        ${footer ? `${footer}<br>` : ""}
        Questions? Reply to this email or visit <a href="${SITE_URL}" style="color:${MUTED};text-decoration:underline;">cookalook.com</a>.<br>
        &copy; ${year} Cook A Look. All rights reserved.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ---------- Sending ----------

export async function sendEmail({ to, subject, html, attachments, throwOnError = false }: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
  throwOnError?: boolean;
}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    if (throwOnError) throw new Error("RESEND_API_KEY not configured");
    console.warn("RESEND_API_KEY missing, skipping email");
    return null;
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(attachments?.length ? { attachments } : {}),
    }),
  });
  if (!resp.ok) {
    const error = await resp.text();
    if (throwOnError) throw new Error(`Failed to send email: ${error}`);
    console.error("Resend error:", error);
    return null;
  }
  return resp.json();
}

// ---------- Recipient time zones ----------

/**
 * Advisor time zone: advisor_profiles.timezone (set on the availability page),
 * then profiles.timezone, then America/Toronto.
 */
// deno-lint-ignore no-explicit-any
export async function advisorTimeZone(supabaseAdmin: any, advisor: { user_id?: string | null; timezone?: string | null } | null) {
  let fromAdvisorProfile: string | null = null;
  if (advisor?.user_id) {
    const { data } = await supabaseAdmin
      .from("advisor_profiles")
      .select("timezone")
      .eq("user_id", advisor.user_id)
      .maybeSingle();
    fromAdvisorProfile = data?.timezone ?? null;
  }
  return pickTimeZone(fromAdvisorProfile, advisor?.timezone);
}

/** Client time zone: the one captured at booking, then their profile, then America/Toronto. */
export function clientTimeZone(booking: { client_timezone?: string | null } | null, client: { timezone?: string | null } | null) {
  return pickTimeZone(booking?.client_timezone, client?.timezone);
}
