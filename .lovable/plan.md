## Context

Your `index.html` already references the correct glasses logo for the favicon (SVG + 16/32/192/512 PNGs + apple-touch-icon). The browser tab shows it correctly. Google's search result, however, still shows the old Lovable logo because Google cached the favicon from an earlier crawl (before your favicon was set) and hasn't refreshed it.

This is a crawler-cache problem, not a code bug. The fix is to (1) make sure every URL variant Google might fetch returns the glasses, (2) bust caches, and (3) nudge Google to recrawl.

## What I'll change

1. **Add a root `/favicon.ico` fallback.** Many crawlers (Google included) request `/favicon.ico` at the site root regardless of `<link>` tags. There's currently no file there. I'll generate a multi-resolution `.ico` (16/32/48) from the glasses SVG and place it at `public/favicon.ico`.

2. **Add an explicit `<link rel="shortcut icon" href="/favicon.ico">`** in `index.html` so the ICO is advertised alongside the SVG/PNG.

3. **Bump the cache-busting query string** on every favicon link from `?v=5` to `?v=6` so Google sees changed URLs on the next crawl.

4. **Tell you the manual step Google requires.** Code alone cannot force Google to refresh a cached favicon. After deploy, you need to:
   - Open Google Search Console → URL Inspection → enter `https://www.cookalook.com/` → "Request indexing".
   - Optionally also inspect `https://www.cookalook.com/favicon.ico` directly.
   - Google typically refreshes the SERP favicon within a few days to a few weeks after recrawl. There's no faster path.

## What I will NOT change

- The glasses SVG/PNG artwork itself — it's already correct.
- The `index.html` head structure, beyond the two lines above.
- Anything in the app UI, routes, or backend.

## Files touched

- `public/favicon.ico` (new, generated from the existing glasses SVG)
- `index.html` (add `shortcut icon` link, bump `?v=5` → `?v=6`)

## Expected outcome

- Browser tab: unchanged (still glasses).
- Direct request to `https://www.cookalook.com/favicon.ico`: now returns the glasses ICO instead of 404.
- Google search result: still shows Lovable logo until Google recrawls; then updates to glasses. You must request reindexing in Search Console to speed this up.
