

## Plan: Create OG Image and Update Social Sharing Meta Tags

### 1. Create OG image (`public/images/og-preview.png`)

Since we can't generate raster images programmatically, I'll create an **SVG file** at `public/images/og-preview.svg` sized 1200×630 with:
- Beige background (`#FAF8F5`)
- Centered sunglasses icon + "COOK A LOOK" wordmark (from existing SVG paths)
- Tagline "Discover your personal style." below in serif font
- Minimal, premium layout

**Important note:** Most social platforms (iMessage, LinkedIn, Twitter, Instagram) require PNG/JPEG for OG images — SVG is not universally supported. I'll create the SVG as a design source, but the recommended approach is to export it as a PNG and place it at `public/images/og-preview.png`. Since Lovable can't do raster conversion, I have two options:
- **Option A**: Create an HTML page that renders the OG image design, which you can screenshot at 1200×630 and save as PNG
- **Option B**: Create the SVG and note that you'll need to convert it externally

I'll go with creating the SVG (which some platforms do support) AND setting up all the meta tags to reference it. If link previews don't render on certain platforms, you can convert the SVG to PNG using any free tool and replace the file.

### 2. Update `index.html` head tags

- Update `og:title` → "Cook A Look | Personal Styling"
- Update `og:description` → "Connect with professional style advisors who transform your wardrobe."
- Add `og:image` → absolute URL to the OG image
- Add `og:image:width` (1200) and `og:image:height` (630)
- Add `og:url` → "https://cookalook.com"
- Update `twitter:card` → "summary_large_image" (for large preview on Twitter/X)
- Add `twitter:image` tag
- Remove `meta name="robots" content="max-image-preview:none"` (this was suppressing image previews in search — contradicts wanting OG images to show)
- Update `twitter:title` and `twitter:description` to match

### Files to create/edit
1. **Create** `public/images/og-preview.svg` — 1200×630 branded OG image
2. **Edit** `index.html` — full social meta tag update

