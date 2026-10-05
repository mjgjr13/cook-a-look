import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CTASection = () => (
  <section className="bg-primary text-primary-foreground py-20 lg:py-24">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-primary-foreground/70">For stylists</p>
        <h2 className="mt-3 font-serif text-4xl md:text-5xl">{"Grow your styling \nbusiness on Cook A Look.\n"}</h2>
        <p className="mt-4 text-lg leading-relaxed text-primary-foreground/80">
          Set your own rates and hours, offer sessions by video or in person, and get paid securely through the platform.
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
  </section>
);

export default CTASection;
