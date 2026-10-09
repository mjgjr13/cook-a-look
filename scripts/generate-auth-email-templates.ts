// Builds the Supabase Auth email templates (confirm sign-up, reset password,
// change email, magic link) from the same layout as every other Cook A Look
// email, into supabase/templates/. Supabase doesn't read these from the repo:
// paste each file into Dashboard → Authentication → Emails → Templates.
//
//   npx tsx scripts/generate-auth-email-templates.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { button, heading, paragraph, renderEmail } from "../supabase/functions/_shared/emailLayout.ts";

// Supabase fills these Go-template placeholders when it sends the email.
const CONFIRMATION_URL = "{{ .ConfirmationURL }}";

const templates: Record<string, { subject: string; html: string }> = {
  "confirm-signup": {
    subject: "Confirm your Cook A Look account",
    html: renderEmail({
      title: "Confirm your email",
      preheader: "One click to finish setting up your Cook A Look account.",
      body:
        heading("Confirm your email") +
        paragraph("Welcome to Cook A Look. Please confirm your email address to finish setting up your account.", { center: true }) +
        button("Confirm email", CONFIRMATION_URL) +
        paragraph("If you didn't create an account, you can ignore this email.", { muted: true, center: true, small: true }),
    }),
  },
  "reset-password": {
    subject: "Reset your Cook A Look password",
    html: renderEmail({
      title: "Reset your password",
      preheader: "Use this link to choose a new password.",
      body:
        heading("Reset your password") +
        paragraph("We received a request to reset the password for your Cook A Look account. Click below to choose a new one.", { center: true }) +
        button("Reset password", CONFIRMATION_URL) +
        paragraph("If you didn't ask for this, you can ignore this email. Your password won't change.", { muted: true, center: true, small: true }),
    }),
  },
  "change-email": {
    subject: "Confirm your new email address",
    html: renderEmail({
      title: "Confirm your new email",
      preheader: "Confirm the change to your Cook A Look email address.",
      body:
        heading("Confirm your new email") +
        paragraph("Please confirm that you want to use {{ .NewEmail }} for your Cook A Look account.", { center: true }) +
        button("Confirm new email", CONFIRMATION_URL) +
        paragraph("If you didn't ask for this change, please reply to this email right away.", { muted: true, center: true, small: true }),
    }),
  },
  "magic-link": {
    subject: "Your Cook A Look sign-in link",
    html: renderEmail({
      title: "Sign in to Cook A Look",
      preheader: "Your one-time sign-in link.",
      body:
        heading("Sign in to Cook A Look") +
        paragraph("Click below to sign in. This link can only be used once.", { center: true }) +
        button("Sign in", CONFIRMATION_URL) +
        paragraph("If you didn't ask to sign in, you can ignore this email.", { muted: true, center: true, small: true }),
    }),
  },
};

const outDir = new URL("../supabase/templates/", import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const [name, { subject, html }] of Object.entries(templates)) {
  // escapeHtml in button() turns the placeholder's quotes-free text through
  // unchanged, but guard anyway so Supabase always sees a working placeholder.
  if (!html.includes(CONFIRMATION_URL)) throw new Error(`${name}: placeholder was escaped`);
  writeFileSync(new URL(`${name}.html`, outDir), html);
  console.log(`${name}.html  subject: ${subject}`);
}
