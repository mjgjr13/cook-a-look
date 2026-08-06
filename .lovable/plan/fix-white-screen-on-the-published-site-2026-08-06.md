# Fix white screen on the published site

## What's happening

The preview renders fine. The published site (cookalook.lovable.app and the custom domain) loads the page shell but the app crashes immediately on startup with:

```text
supabaseUrl is required.
```

The backend connection values are present in the sandbox environment but were not baked into the published build, so the app can't reach the backend and React renders nothing — a white screen.

## Fix

1. Re-publish the project so a fresh build is produced with the backend environment values injected.
2. Re-check the published URL and confirm the homepage renders and advisor data loads (no `supabaseUrl is required` error in the console).
3. If the fresh build still ships without those values, add a safe fallback in the backend client so the public project URL and publishable key (both non-secret, already public in the browser bundle) are used when the build-time variables are missing. This makes the published app resilient to a missing build environment.
4. Re-verify the published site and the custom domain after the change.

## Technical notes

- `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `import.meta.env`. Both are set in `.env` locally, and `.env` is gitignored, so the deploy build depends on the platform injecting them.
- Step 3 fallback would be constants in that file guarded by `??`, keeping the env values as the primary source. No secret values are involved — the publishable/anon key is safe in client code.
- No database, RLS, or edge function changes are needed.
