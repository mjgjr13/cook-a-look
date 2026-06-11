## Problem
Both sunglasses lenses currently use the same `-2°` rotation, making the right lens tilt the same direction as the left. This breaks mirror symmetry.

## Fix
Change the right lens rotation from `rotate(-2 30.5 8)` to `rotate(2 30.5 8)` in all brand SVG assets:

1. **React component** — `src/components/CookALookLogo.tsx` (right `<path>` transform)
2. **Public logo** — `public/images/cook-a-look-logo.svg` (right lens path)
3. **Favicon** — `public/images/cook-a-look-favicon.svg` (right lens path)
4. **OG preview** — `src/pages/OgPreview.tsx` (right lens path)

This gives the left lens a `-2°` tilt (counter-clockwise) and the right lens a `+2°` tilt (clockwise), creating natural face-hugging symmetry without altering the Wayfarer shape.