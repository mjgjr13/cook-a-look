

## Use the Cook A Look Sunglasses SVG as Favicon

### Problem
The current favicon at `/images/cook-a-look-logo-icon.png` is displaying as the Lovable logo. The user wants the sunglasses icon (the one rendered by the `CookALookLogo` component in the navbar) to be used instead.

### Solution
Extract the sunglasses SVG from `src/components/CookALookLogo.tsx` into a standalone SVG file and set it as the favicon.

### Changes

| File | Change |
|------|--------|
| `public/images/cook-a-look-favicon.svg` | **New file** -- standalone SVG of the Wayfarer sunglasses icon extracted from the `CookALookLogo` component (black fill, transparent background) |
| `index.html` | Update all `<link rel="icon">` and `<link rel="apple-touch-icon">` tags to point to `/images/cook-a-look-favicon.svg` instead of the PNG |

### Technical Detail

The SVG will be a direct copy of the sunglasses paths from `CookALookLogo.tsx`:
- Left and right Wayfarer lenses
- Bridge connector
- Temple hints
- Black fill on transparent background
- Proper `viewBox` for crisp rendering at small sizes

SVG favicons are supported by all modern browsers and render crisply at any size. The `type` attribute on the link tag will be set to `image/svg+xml`.

### Not Changed
- The `CookALookLogo` component itself
- Any visible UI, layout, or marketing copy
- The `max-image-preview:none` meta tag (still to be added per the previous plan)
- og/twitter meta tags

