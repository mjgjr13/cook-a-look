#!/bin/zsh
# Sets the edge-function secrets on the CAL Supabase project.
# Run in the Terminal app:  zsh scripts/set-cal-secrets.sh
# Only some keys:           zsh scripts/set-cal-secrets.sh STRIPE_SECRET_KEY DAILY_API_KEY RESEND_API_KEY
# For each key: copy it (the copy icon in the dashboard), then press Enter — the script reads the
# clipboard, so there is nothing to paste. Type s + Enter to skip a key. The clipboard is cleared after.
# CRON_SECRET is only (re)generated on a full run with no names given.
set -u
REF=qdpqfsqjtbvlulekfhoy
cd "$(dirname "$0")/.."
ONLY=("$@")

ask() { # name, prompt, required prefix regex
  local v
  if (( ${#ONLY[@]} )) && (( ! ${ONLY[(Ie)$1]} )); then return; fi
  local a
  while true; do
    echo "$2"
    read -r "a?  Click the copy icon next to the key, then press Enter here (or type s and Enter to skip): "
    if [[ "$a" == [sS] ]]; then echo "  - $1 skipped"; return; fi
    v="$(pbpaste)"
    v="${v//[[:space:]]/}"
    if [[ -z "$v" ]]; then echo "  ✗ Nothing was copied. Click the copy icon again, then press Enter."; continue; fi
    if [[ "$v" =~ $3 ]]; then break; fi
    echo "  ✗ What you copied isn't a $1. It starts with \"${v[1,8]}\" (${#v} characters). Copy the right key and try again."
  done
  echo "  Got it: ${v[1,8]}… (${#v} characters)"
  print -n "" | pbcopy  # clear the key from the clipboard
  npx supabase secrets set "$1=$v" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ $1 set" || echo "  ✗ $1 failed"
  unset v
}

echo "Setting Cook A Look secrets on CAL ($REF)."
if ! npx supabase secrets list --project-ref $REF >/dev/null 2>&1; then
  echo "First, log in to Supabase (a browser window opens; approve it, then come back here)."
  npx supabase login || { echo "  ✗ Supabase login failed. Nothing was changed."; exit 1; }
fi
ask STRIPE_SECRET_KEY     "Stripe secret key (TEST mode, starts with sk_test_)"            '^(sk|rk)_test_'
ask STRIPE_WEBHOOK_SECRET "Stripe webhook signing secret (starts with whsec_)"             '^whsec_'
ask DAILY_API_KEY         "Daily.co API key (Daily dashboard → Developers)"               '^[^[:space:]]{20,}$'
ask RESEND_API_KEY        "Resend API key (starts with re_)"                              '^re_'
ask ANTHROPIC_API_KEY     "Anthropic API key for the AI Concierge (starts with sk-ant-)"  '^sk-ant-'

if (( ! ${#ONLY[@]} )); then
  # Shared secret for scheduled jobs (reminders, review requests, completing bookings).
  npx supabase secrets set "CRON_SECRET=$(openssl rand -hex 32)" --project-ref $REF >/dev/null 2>&1 && echo "  ✓ CRON_SECRET generated and set"
fi

echo "Done. Each key should now have a different fingerprint:"
npx supabase secrets list --project-ref $REF -o json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);for(const x of (j.secrets||j)) if(!x.name.startsWith("SUPABASE_")) console.log("  "+x.name.padEnd(24)+x.value.slice(0,12))})'
