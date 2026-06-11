import { Helmet } from "react-helmet-async";
import { Download } from "lucide-react";
import Layout from "@/components/layout/Layout";

type Asset = {
  label: string;
  description: string;
  href: string;
  filename: string;
};

const assets: Asset[] = [
  {
    label: "SVG",
    description: "Vector source. Scales infinitely. Best for web and digital.",
    href: "/brand/cook-a-look-logo.svg",
    filename: "cook-a-look-logo.svg",
  },
  {
    label: "EPS",
    description: "Vector format for print shops, Illustrator, and signage.",
    href: "/brand/cook-a-look-logo.eps",
    filename: "cook-a-look-logo.eps",
  },
  {
    label: "PNG · 512px",
    description: "Transparent background. Social avatars and small placements.",
    href: "/brand/cook-a-look-logo-512.png",
    filename: "cook-a-look-logo-512.png",
  },
  {
    label: "PNG · 1024px",
    description: "Transparent background. Newsletters and presentations.",
    href: "/brand/cook-a-look-logo-1024.png",
    filename: "cook-a-look-logo-1024.png",
  },
  {
    label: "PNG · 2600px",
    description: "Transparent background. Print, banners, and large displays.",
    href: "/brand/cook-a-look-logo-2600.png",
    filename: "cook-a-look-logo-2600.png",
  },
];

const Brand = () => {
  return (
    <Layout>
      <Helmet>
        <title>Press Kit & Brand Assets | Cook A Look</title>
        <meta
          name="description"
          content="Download the Cook A Look logo in SVG, EPS, and PNG formats for editorial, press, and promotional use."
        />
        <link rel="canonical" href="https://www.cookalook.com/brand" />
      </Helmet>

      <h1 className="sr-only">Cook A Look Press Kit & Brand Assets</h1>

      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="font-sans text-xs tracking-[0.3em] uppercase text-muted-foreground mb-4">
            Press Kit
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl text-primary mb-6">
            Brand Assets
          </h2>
          <p className="font-sans text-base text-muted-foreground leading-relaxed">
            Download the Cook A Look logo for editorial, press, and approved
            promotional use. Please preserve the original proportions and clear
            space, and do not alter the colors or composition.
          </p>
        </div>

        {/* Logo previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          <div className="bg-background border border-border rounded-sm p-12 flex items-center justify-center min-h-[200px]">
            <img
              src="/brand/cook-a-look-logo.svg"
              alt="Cook A Look logo on light background"
              className="w-full max-w-[320px]"
            />
          </div>
          <div className="bg-primary rounded-sm p-12 flex items-center justify-center min-h-[200px]">
            <img
              src="/brand/cook-a-look-logo.svg"
              alt="Cook A Look logo on dark background"
              className="w-full max-w-[320px] invert"
            />
          </div>
        </div>

        {/* Downloads */}
        <div className="mt-16">
          <h3 className="font-serif text-2xl text-primary mb-8">Downloads</h3>
          <div className="divide-y divide-border border-t border-b border-border">
            {assets.map((asset) => (
              <a
                key={asset.href}
                href={asset.href}
                download={asset.filename}
                className="flex items-center justify-between gap-6 py-5 group hover:bg-secondary/30 transition-colors px-2 -mx-2"
              >
                <div className="min-w-0">
                  <div className="font-serif text-lg text-primary">
                    {asset.label}
                  </div>
                  <div className="font-sans text-sm text-muted-foreground mt-1">
                    {asset.description}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-sans text-xs tracking-[0.2em] uppercase text-primary group-hover:translate-x-1 transition-transform shrink-0">
                  Download
                  <Download size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Usage guidelines */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
          <div>
            <h3 className="font-serif text-2xl text-primary mb-4">Clear Space</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              Maintain padding around the logo equal to at least the height of
              the sunglasses icon. Do not crowd it with other graphics or text.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-primary mb-4">Color</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              The default logo is charcoal on a light background. On dark
              surfaces, use the inverted (white) version. Do not recolor the
              logo or apply gradients, shadows, or effects.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-primary mb-4">Naming</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              Always write the brand as <strong>Cook A Look</strong>. Do not
              abbreviate, hyphenate, or alter capitalization.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-primary mb-4">Questions</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              For partnership inquiries or custom asset requests, contact{" "}
              <a
                href="mailto:info@cookalook.com"
                className="underline underline-offset-4 hover:text-primary"
              >
                info@cookalook.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Brand;
