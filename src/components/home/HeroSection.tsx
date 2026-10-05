import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import HowItWorksIllustration from "@/components/home/HowItWorksIllustration";

const HeroSection = () => (
  <section className="bg-background border-b border-border flex items-center lg:min-h-[calc(100svh-9.5rem)]">
    <div className="container mx-auto w-full px-5 sm:px-6 lg:px-8 py-10 sm:py-12 lg:pt-8 lg:pb-14">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 items-center">
        <div className="lg:col-span-6">
          <h1 className="font-serif text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl text-foreground">
            Discover your personal style
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Connect with world-class style advisors, virtually or in person, who will transform your
            wardrobe and elevate your personal style to new heights.
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
          <HowItWorksIllustration />
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
