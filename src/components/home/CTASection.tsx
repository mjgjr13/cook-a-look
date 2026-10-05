import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Full-width, centered section in the site's own palette (not a floating box),
// so it reads as part of the page and stays visually separate from the footer.
const CTASection = () => (
  <section className="bg-card border-t border-border">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-gold">For Stylists</p>
        <h2 className="mt-3 font-serif text-4xl md:text-5xl">Grow your styling business.</h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Earn extra income doing what you love. Set your own rates and hours, meet clients by video or in
          person, and get paid securely after every session.
        </p>
        <div className="mt-8 flex justify-center">
          <Button variant="hero" size="xl" asChild>
            <Link to="/become-advisor">Apply to become an advisor</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default CTASection;
