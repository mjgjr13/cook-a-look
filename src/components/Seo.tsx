import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.cookalook.com";
const DEFAULT_OG = `${SITE_URL}/images/og-preview.png`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const Seo = ({ title, description, path, ogImage, ogType = "website", jsonLd, noindex }: SeoProps) => {
  const url = `${SITE_URL}${path}`;
  const image = ogImage || DEFAULT_OG;
  const desc = description.length > 160 ? description.slice(0, 157).trimEnd() + "..." : description;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={image} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default Seo;
