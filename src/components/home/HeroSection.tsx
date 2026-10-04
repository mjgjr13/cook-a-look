import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// First question the Style Concierge asks, offered up front (the quiz-first
// pattern used by Stitch Fix / Wishi). Each starts a concierge conversation.
const OCCASIONS = [
  "A wedding or event",
  "Work and the office",
  "A date",
  "An everyday refresh",
  "Travel",
  "Something else",
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background border-b border-border">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
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
                <Link to="/style-concierge">Ask the Style Concierge</Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-border bg-card p-6 sm:p-8">
              <p className="text-sm font-semibold text-foreground">What are you dressing for?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Our Style Concierge asks a few quick questions, then suggests pieces, brands, and advisors who fit.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OCCASIONS.map((occasion) => (
                  <button
                    key={occasion}
                    type="button"
                    onClick={() => navigate(`/style-concierge?start=${encodeURIComponent(occasion)}`)}
                    className="min-h-11 border border-border bg-background px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {occasion}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">AI-powered. Free to use, no account needed.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
