#!/bin/zsh
# Sets the edge-function secrets on the CAL Supabase project.
# Run in the Terminal app:  zsh scripts/set-cal-secrets.sh
# Only some keys:           zsh scripts/set-cal-secrets.sh STRIPE_SECRET_KEY DAILY_API_KEY RESEND_API_KEY
# Nothing you type is shown or saved; press Enter on a prompt to skip it.
# CRON_SECRET is only (re)generated on a full run with no names given.
set -u
REF=qdpqfsqjtbvlulekfhoy
cd "$(dirname "$0")/.."
ONLY=("$@")

ask() { # name, prompt, required prefix regex
  local v
  if (( ${#ONLY[@]} )) && (( ! ${ONLY[(Ie)$1]} )); then return; fi
  while true; do
    read -rs "v?$2: "; echo
    v="${v//[[:space:]]/}"
    if [[ -z "$v" ]]; then echo "  - $1 skipped"; unset v; return; fi
    if [[ "$v" =~ $3 ]]; then break; fi
    echo "  ✗ That doesn't look like a $1 (expected: $2). Try again, or press Enter to skip."
  done
  npx supabase secrets set "$1=$v" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ $1 set" || echo "  ✗ $1 failed"
  unset v
}

echo "Setting Cook A Look secrets on CAL ($REF)."
ask STRIPE_SECRET_KEY     "Stripe secret key (TEST mode, starts with sk_test_)"            '^(sk|rk)_test_'
ask STRIPE_WEBHOOK_SECRET "Stripe webhook signing secret (starts with whsec_)"             '^whsec_'
ask DAILY_API_KEY         "Daily.co API key (Daily dashboard → Developers)"               '^[A-Za-z0-9]{32,}$'
ask RESEND_API_KEY        "Resend API key (starts with re_)"                              '^re_'
ask ANTHROPIC_API_KEY     "Anthropic API key for the AI Concierge (starts with sk-ant-)"  '^sk-ant-'

if (( ! ${#ONLY[@]} )); then
  # Shared secret for scheduled jobs (reminders, review requests, completing bookings).
  npx supabase secrets set "CRON_SECRET=$(openssl rand -hex 32)" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ CRON_SECRET generated and set"
fi

echo "Done. Each key should now have a different fingerprint:"
npx supabase secrets list --project-ref $REF -o json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);for(const x of (j.secrets||j)) if(!x.name.startsWith("SUPABASE_")) console.log("  "+x.name.padEnd(24)+x.value.slice(0,12))})'
