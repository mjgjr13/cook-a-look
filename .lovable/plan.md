

## Plan: Generate a proper 1200×630 PNG OG image

### Problem
The current `og-preview.svg` is ignored by all major social platforms. We need a **PNG** at exactly **1200×630 pixels**.

### Approach
Use the Lovable AI image generation model to create a branded OG preview image matching the SVG design:
- Beige background (#FAF8F5)
- Centered Cook A Look sunglasses logo + wordmark
- Tagline "Discover your personal style."
- Minimal, premium aesthetic

### Steps

1. **Create a backend function** that calls the image generation API to produce a 1200×630 branded PNG, then stores it in file storage
2. **Download and place** the result at `public/images/og-preview.png`
3. **Update `index.html`** meta tags to reference `.png` instead of `.svg`:
   - `og:image` → `https://cookalook.com/images/og-preview.png`
   - `twitter:image` → `https://cookalook.com/images/og-preview.png`
   - Add `og:image:type` → `image/png`

**Simpler alternative**: Create a small utility page (`/og-preview`) that renders the OG design in HTML/CSS at 1200×630. You screenshot it in your browser and save as `og-preview.png`, then I update the meta tags. This is more reliable for exact brand matching since AI image generation may not perfectly replicate the logo.

### Recommendation
The **utility page approach** is more reliable — AI image gen won't perfectly reproduce your specific sunglasses SVG paths and serif typography. I'll create a hidden `/og-preview` page styled exactly like your SVG design, you take a screenshot at 1200×630, save it as PNG, and I'll wire up the meta tags.

