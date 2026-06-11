## Problem

The favicon glasses appear squished in browser tabs. Root cause: `public/images/cook-a-look-favicon.svg` has `viewBox="0 0 48 48"` but the glasses geometry sits in a band roughly 42 wide × 15 tall, pushed to the bottom of the canvas by `transform="translate(3 16)"`. When browsers render this at 16×16 / 32×32, the wide-but-short artwork gets visually crushed vertically.

The PNG files (`cook-a-look-favicon-16.png`, `cook-a-look-favicon-32.png`) and `favicon.ico` were generated from this same squashed source, so they all need to be regenerated.

## Fix

1. **Rewrite `public/images/cook-a-look-favicon.svg`** so the glasses artwork fills the full 1:1 canvas with even padding on all sides. Same shapes (two rounded-rectangle lenses, bridge, two temple tips), but scaled up and centered in a tighter viewBox so the icon reads clearly at favicon sizes.

2. **Regenerate the raster favicons** from the corrected SVG:
   - `public/images/cook-a-look-favicon-16.png` (16×16)
   - `public/images/cook-a-look-favicon-32.png` (32×32)
   - `public/favicon.ico` (multi-size ICO: 16, 32, 48)
   - `public/apple-touch-icon.png` (180×180) for consistency

   Done with a one-off script using `sharp` (or ImageMagick) on the new SVG.

3. **Bust cache**: append a `?v=2` query string to the favicon `<link>` hrefs in `index.html` so browsers fetch the new versions instead of the cached squished ones.

## Notes

- No changes to the press-kit logo (`public/brand/*`) — that's the wordmark logo, not the favicon glyph.
- Site manifest icons in `site.webmanifest` already reference the same PNG paths, so regeneration covers them automatically.
