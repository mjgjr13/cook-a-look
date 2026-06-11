## Goal
Turn the "oo" in **LOOK** into a pair of glasses so the wordmark itself carries the brand mark. Remove the separate sunglasses icon (which read asymmetrically) so there's a single, refined logo across the entire site.

## Approach
Rebuild `src/components/CookALookLogo.tsx` as a custom SVG wordmark instead of CSS text + icon. This is the only way to guarantee the two O's land in a perfectly mirrored position, share a centered bridge, and stay aligned at every size.

### Wordmark construction
- One inline SVG renders the full phrase: `COOK A LOOK`.
- Letters are rendered as `<text>` in Playfair Display, semibold, letter-spaced `0.2em`, uppercase — matching current typography.
- The two O's of **LOOK** are drawn as SVG `<circle>` (or rounded rect) lenses instead of glyphs, so they're geometrically identical.
- A short stroked path connects the two lenses as a bridge, centered on the midpoint between them.
- Tiny temple tips extend outward from the outer edges of each lens — mirrored exactly.
- Stroke widths and lens radius scale with the `size` prop so the glasses always read at sm / md / lg / xl.
- `aria-label="Cook A Look"` on the root SVG; underlying letters use `<title>` for screen readers. Visual O's stay decorative.

### Variants
- `type="full"` → the new wordmark SVG (default everywhere).
- `type="text"` → same wordmark SVG (text-only is now identical, since the glasses live inside the text).
- `type="icon"` → just the two-lens glasses unit (the "oo" pulled out), used for compact slots / favicon-style spots. Perfectly symmetric: two equal circles + centered bridge + mirrored temple tips.
- `variant="dark" | "light"` → swaps fill/stroke color (charcoal vs white) unchanged.

### Symmetry guarantees
- Lenses: identical `r` and `cy`, `cx` values mirrored around the LOOK midpoint.
- Bridge: quadratic curve with control point exactly on the vertical axis between the two lenses.
- Temples: two line segments with mirrored end coordinates.
- No `rotate(-2 …)` transforms (those caused the current asymmetric feel).

## Files touched
- `src/components/CookALookLogo.tsx` — rewritten.
- No call sites change. Navbar, Footer, and every other consumer keep using `<CookALookLogo />` with the same props.
- Favicon SVG is not touched in this pass (separate asset). Can do a follow-up if you want the favicon to match the new "oo" mark.

## Out of scope
- Color palette, typography pairing, navbar/footer layout.
- Favicon / OG image regeneration.
- Any other UI.

## Verification
- Visually inspect navbar (light + dark sections), footer, and any icon-only slot at 1x and 2x DPR.
- Confirm the two lenses are pixel-mirrored and the bridge is centered.
- Confirm "Cook A Look" still reads cleanly at sm / md / lg / xl without wrapping.
