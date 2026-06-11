# Brand Assets / Press Kit Page

Create a simple, on-brand page where you (or press/partners) can download the Cook A Look logo in multiple formats for promotional use.

## What gets built

1. **New route: `/brand`** (linked from the footer under a small "Press Kit" link)
   - Editorial layout matching the site (cream bg, Playfair headings, Inter body)
   - Logo preview on light AND dark backgrounds
   - Download buttons for each format
   - Short usage guidelines (clear space, do/don't, color values)

2. **Logo formats available for download**
   - **SVG** — the existing `public/images/cook-a-look-logo.svg` (vector, web/print)
   - **PNG** — transparent background, exported at 512px, 1024px, and 2600px wide
   - **EPS** — vector format for print shops / Adobe Illustrator workflows

3. **Where files live**
   - All export files stored in `public/brand/` so they're served as static downloads with clean URLs (e.g. `/brand/cook-a-look-logo.eps`)
   - `download` attribute on links so the browser saves them directly

## Technical notes

- EPS generation: convert the existing SVG to EPS once using Inkscape/CLI during this build and commit the resulting `.eps` file to `public/brand/`. No runtime conversion needed.
- PNGs generated the same way (one-time export from SVG at the three sizes).
- Page is fully static — no auth, no backend changes.
- Footer gets one new link: "Press Kit" → `/brand`.

## Out of scope (ask if you want these)

- Wordmark-only or icon-only variants
- Color palette swatches / typography specs download
- Gated access (login required to download)

Ready to switch to build mode and implement this?
