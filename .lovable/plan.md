

## Add Sitemap to Project

Copy the uploaded `sitemap.xml` to `public/sitemap.xml` so it is served at `https://cookalook.com/sitemap.xml` for search engine crawling.

Currently the sitemap only contains one URL (the homepage). We should also expand it to include all public routes in the application for better SEO coverage.

### Steps

1. **Copy sitemap.xml to public/** -- Place the file at `public/sitemap.xml`

2. **Expand sitemap with all public routes** -- Add entries for all publicly accessible pages:
   - `/` (homepage)
   - `/signin`
   - `/signup`
   - `/advisors`
   - `/lookbook`
   - `/become-advisor`
   - `/privacy-policy`
   - `/terms-of-use`
   - `/forgot-password`

3. **Update robots.txt** -- Add a `Sitemap:` directive pointing to the sitemap URL so crawlers can discover it automatically.

### Technical Details

- The sitemap will be a static XML file in `public/` served as-is by Vite/the hosting platform
- `lastmod` dates will be set to today's date (2026-02-10)
- `robots.txt` will get a line: `Sitemap: https://www.cookalook.com/sitemap.xml`

