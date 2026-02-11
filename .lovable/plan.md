

## Update Homepage SEO and Brand Name Consistency

### Changes Overview

| File | Change |
|------|--------|
| `index.html` | Update `<title>` to "Cook A Look \| Personal Styling" |
| `src/components/home/HeroSection.tsx` | Change H1 from "Discover your personal style" to "Cook A Look" |
| `src/components/CookALookLogo.tsx` | Change logo text from "Cook a Look" to "Cook A Look" (capitalize the "A") |
| `src/components/layout/Footer.tsx` | Copyright text already uses the logo component, so it will update automatically |

### Details

**1. Page title** (`index.html`, line 6)
- From: `Cook A Look`
- To: `Cook A Look | Personal Styling`

**2. Homepage H1** (`HeroSection.tsx`, lines 34-37)
- From: `Discover your personal style`
- To: `Cook A Look` (styled consistently with the current serif font)
- The subtitle paragraph below will remain unchanged, preserving context about what the site does

**3. Logo text** (`CookALookLogo.tsx`, lines 96 and 114)
- From: `Cook a Look` (lowercase "a")
- To: `Cook A Look` (uppercase "A")
- This affects the navbar, footer, and anywhere else the logo component is used

**4. Metadata and structured data**
- Already correct: og:title, twitter:title, JSON-LD Organization name, and WebSite name all say "Cook A Look"
- No og:image or twitter:image tags are present (already removed previously), so no hero image will appear in search results

### Not Changed
- Edge function email templates and legal pages (Terms, Privacy) use "Cook a Look" as a stylistic/legal choice -- these are not search-facing and won't affect Google results
- Layout, design, and functionality remain untouched

