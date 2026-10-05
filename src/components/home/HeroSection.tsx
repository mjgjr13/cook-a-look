import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mixed menswear / womenswear so everyone sees themselves here.
// CC0 photos from ISO Republic (see docs/IMAGE_CREDITS.md).
const HERO_IMAGES = [
  { src: "/images/home/hero-1.webp", alt: "Man adjusting the cuff of a tailored blazer" },
  { src: "/images/home/hero-2.webp", alt: "Woman wearing round statement sunglasses" },
  { src: "/images/home/hero-3.webp", alt: "Smiling woman in a light sleeveless top" },
  { src: "/images/home/hero-4.webp", alt: "Man in smart-casual clothes working on a laptop" },
];

const HeroSection = () => (
  <section className="bg-background border-b border-border">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-center">
        <div className="lg:col-span-6">
          <h1 className="font-serif text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl text-foreground">
            A personal stylist for the moments that matter.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Book a one-on-one session with an independent style advisor, by video or in person.
            Bring your closet, your event, or your questions, and leave with a plan.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/advisors">
                Find your advisor <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/ai-concierge">Ask the AI Concierge</Link>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {HERO_IMAGES.map((img, i) => (
              <div key={img.src} className={`overflow-hidden bg-muted aspect-[4/5] ${i % 2 === 1 ? "translate-y-6" : ""}`}>
                <img
                  src={img.src}
                  alt={img.alt}
                  width={720}
                  height={900}
                  className="h-full w-full object-cover"
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={i === 0 ? "high" : "auto"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
