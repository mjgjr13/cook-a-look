

## Add JSON-LD Structured Data to Homepage

Add Organization and WebSite schema markup to help Google understand the Cook A Look brand and potentially show rich results (like sitelinks search box).

### What is JSON-LD?
It's invisible metadata embedded in the page that tells Google exactly what your site is about -- your brand name, logo, social links, and that it's a searchable website.

### About the Sitemap Display
The "This XML file does not appear to have any style information" message you see in your browser is **completely normal**. That's just how browsers display raw XML. Google's crawlers read and process it correctly -- no changes needed.

### Steps

1. **Add JSON-LD script to `index.html`** with two schemas:
   - **Organization**: Brand name "Cook A Look", logo URL, website URL, description, and social media links
   - **WebSite**: Site name, URL, and a potential search action for sitelinks

### Technical Details

Add the following inside the `<head>` of `index.html`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Cook A Look",
      "url": "https://www.cookalook.com",
      "logo": "https://www.cookalook.com/images/cook-a-look-logo-full.png",
      "description": "Connect with professional style advisors who will transform your wardrobe and elevate your personal style.",
      "sameAs": [
        "https://twitter.com/CookALook"
      ]
    },
    {
      "@type": "WebSite",
      "name": "Cook A Look",
      "url": "https://www.cookalook.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.cookalook.com/advisors?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
```

**File changed:** `index.html` (1 addition in `<head>`)

