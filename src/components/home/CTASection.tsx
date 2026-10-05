import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Inset card (not full-bleed) so it never merges into the black footer.
const CTASection = () => (
  <section className="bg-background py-16 lg:py-24">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8">
      <div className="bg-primary text-primary-foreground px-6 py-12 sm:px-10 lg:px-14 lg:py-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary-foreground/70">For stylists</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Grow your styling business.</h2>
          <p className="mt-4 text-lg leading-relaxed text-primary-foreground/80">
            Earn extra income doing what you love. Set your own rates and hours, meet clients by video or in
            person, and get paid securely after every session.
          </p>
        </div>
        <Button
          size="xl"
          asChild
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold rounded-sm shrink-0"
        >
          <Link to="/become-advisor">Apply to become an advisor</Link>
        </Button>
      </div>
    </div>
  </section>
);

export default CTASection;
