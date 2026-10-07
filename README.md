# Cook A Look

Marketplace connecting clients with style advisors for video and in-person styling sessions — https://www.cookalook.com

## Stack

| Piece | Where |
|---|---|
| Code | GitHub (`main` deploys automatically) |
| Website hosting | Cloudflare Pages |
| Database, sign-in, file storage, server functions | Supabase project **CAL** (`qdpqfsqjtbvlulekfhoy`) |
| Payments | Stripe (Checkout + webhook `stripe-webhook`) |
| Video | Daily.co (Jitsi fallback) |
| Email | Resend (transactional emails and Supabase Auth SMTP) |
| AI Concierge | Anthropic Claude |

## Local development

```sh
npm i
npm run dev        # http://localhost:8080
npm run build
npm run lint
npm run check:functions
```

The site reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`, falling back to CAL's public values in `src/integrations/supabase/client.ts`. Google Places autocomplete needs `VITE_GOOGLE_MAPS_BROWSER_KEY`.

## Backend

```sh
npx supabase login
npx supabase link --project-ref qdpqfsqjtbvlulekfhoy
npx supabase db push --linked                                   # apply new migrations
npx supabase functions deploy <name> --project-ref qdpqfsqjtbvlulekfhoy --use-api
npx supabase secrets list --project-ref qdpqfsqjtbvlulekfhoy    # names only
```

Edge-function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DAILY_API_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `ADMIN_EMAIL`.

See `CLAUDE.md` for architecture and conventions and `docs/notes/` for business rules.
