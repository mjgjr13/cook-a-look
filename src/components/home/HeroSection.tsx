import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import HowItWorksIllustration from "@/components/home/HowItWorksIllustration";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { useHomepageAdvisors, HERO_PORTRAIT_COUNT } from "@/hooks/useHomepageAdvisors";

/** Advisor portraits, staggered in two columns. Each links to that advisor's profile. */
const HeroPortraits = () => {
  const { hero, isLoading } = useHomepageAdvisors();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4" aria-hidden="true">
        {Array.from({ length: HERO_PORTRAIT_COUNT }, (_, i) => (
          <div key={i} className={i % 2 ? "mt-8 sm:mt-10" : undefined}>
            <div className="aspect-[4/5] bg-muted" />
            <div className="mt-2 h-8" />
          </div>
        ))}
      </div>
    );
  }

  if (hero.length < 2) return <HowItWorksIllustration />;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Some of our style advisors">
      {hero.map((advisor, i) => {
        const name = advisor.full_name || "Style advisor";
        return (
          <li key={advisor.id} className={i % 2 ? "mt-8 sm:mt-10" : undefined}>
            <Link to={`/advisors/${advisor.id}`} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-muted">
                <img
                  src={optimizedImageUrl(advisor.avatar_url!, 560, 700)}
                  onError={fallbackToOriginal(advisor.avatar_url!)}
                  alt={`${name}, style advisor`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  decoding="async"
                  {...(i === 0 ? { fetchpriority: "high" } : {})}
                />
              </div>
              <p className="mt-2 text-xs leading-snug">
                <span className="block truncate text-foreground group-hover:underline underline-offset-4">{name}</span>
                <span className="block text-muted-foreground">
                  {[
                    advisor.price_per_session ? `$${advisor.price_per_session.toLocaleString()}/hr` : null,
                    advisor.isSample ? "Sample profile" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

const HeroSection = () => (
  <section className="bg-background border-b border-border flex items-center lg:min-h-[calc(100svh-9.5rem)]">
    <div className="container mx-auto w-full px-5 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-center">
        <div className="lg:col-span-6">
          <h1 className="font-serif text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl text-foreground">
            Discover your personal style
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Book a one-on-one session with a style advisor, by video or in person. See every
            advisor's price and availability before you book.
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
          <div className="mx-auto w-full max-w-[460px] lg:mr-0">
            <HeroPortraits />
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
