#!/bin/zsh
# Sets the edge-function secrets on the CAL Supabase project.
# Run in the Terminal app:  zsh scripts/set-cal-secrets.sh
# Nothing you type is shown or saved; press Enter on a prompt to skip it.
set -u
REF=qdpqfsqjtbvlulekfhoy
cd "$(dirname "$0")/.."

ask() { # name, prompt
  local v
  read -rs "v?$2: "; echo
  if [[ -n "$v" ]]; then
    npx supabase secrets set "$1=$v" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ $1 set" || echo "  ✗ $1 failed"
  else
    echo "  - $1 skipped"
  fi
  unset v
}

echo "Setting Cook A Look secrets on CAL ($REF)."
ask STRIPE_SECRET_KEY     "Stripe secret key (TEST mode, starts with sk_test_)"
ask STRIPE_WEBHOOK_SECRET "Stripe webhook signing secret (whsec_..., Enter to skip until step 7)"
ask DAILY_API_KEY         "Daily.co API key"
ask RESEND_API_KEY        "Resend API key (re_...)"
ask ANTHROPIC_API_KEY     "Anthropic API key for the AI Concierge (sk-ant-...)"

# Shared secret for scheduled jobs (reminders, review requests, completing bookings).
npx supabase secrets set "CRON_SECRET=$(openssl rand -hex 32)" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ CRON_SECRET generated and set"

echo "Done. Secret names now on CAL:"
npx supabase secrets list --project-ref $REF -o json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);for(const x of (j.secrets||j)) console.log("  "+x.name)})'
