

## Plan: Consolidate Logo and Update All Branding

### Current State
- The logo is rendered as an **inline SVG** in `src/components/CookALookLogo.tsx` (sunglasses icon + "Cook A Look" serif text)
- Old PNG files that need deleting:
  - `public/images/cook-a-look-logo-full.png`
  - `public/images/cook-a-look-logo-icon.png`
  - `src/assets/cook-a-look-logo-full.png`
  - `src/assets/cook-a-look-logo-icon.png`
  - `src/assets/cook-a-look-logo.png`
- Favicon SVG at `public/images/cook-a-look-favicon.svg` (sunglasses only)

### Important Limitation
Lovable cannot programmatically render a React component to a PNG file at build time. The logo lives as an SVG component, which is already resolution-independent and works perfectly everywhere in the app. Here's what I'll do instead:

### Implementation Steps

1. **Create a standalone full-logo SVG** (`public/images/cook-a-look-logo.svg`)
   - Combine the sunglasses SVG paths with "COOK A LOOK" text in a single SVG file
   - This becomes the single source of truth for all branding — scalable to any size, works as favicon and OG image source

2. **Update the favicon** in `index.html` to point to the new full logo SVG (or keep the sunglasses-only version for favicon since text is too small at 16×16 — will keep `cook-a-look-favicon.svg` for favicon use)

3. **Delete old PNG logo files**:
   - `public/images/cook-a-look-logo-full.png`
   - `public/images/cook-a-look-logo-icon.png`
   - `src/assets/cook-a-look-logo-full.png`
   - `src/assets/cook-a-look-logo-icon.png`
   - `src/assets/cook-a-look-logo.png`

4. **Update references**:
   - `index.html` structured data `"logo"` field → point to the new SVG
   - Any imports of the deleted files → remove or redirect to the component

5. **No changes needed** to `CookALookLogo.tsx` — it already renders the correct logo everywhere in the app (navbar, footer, etc.)

### Technical Note
For external branding use (business cards, social media, etc.), the SVG file can be opened in any browser and exported/screenshotted at any resolution. Alternatively, tools like Figma or Canva can import the SVG directly.

