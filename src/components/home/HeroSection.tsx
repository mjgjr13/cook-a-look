import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2 }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-accent rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.02 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Brand Logo - Prominent */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <img 
              src={logo} 
              alt="Cook a Look" 
              className="h-16 md:h-20 w-auto mx-auto md:mx-0"
            />
          </motion.div>

          {/* Bold Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium leading-[0.95] tracking-tight mb-8"
          >
            Your style,
            <br />
            <span className="text-accent">elevated.</span>
          </motion.h1>

          {/* Supporting Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-sans text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-xl"
          >
            Connect with world-class style advisors who understand 
            that great style isn't about following trends—it's about 
            discovering what makes you unforgettable.
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button variant="default" size="xl" asChild className="group">
              <Link to="/advisors">
                Find Your Advisor
                <motion.span
                  className="inline-block ml-2"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  →
                </motion.span>
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/lookbook">View Lookbook</Link>
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-16 pt-8 border-t border-border/50"
          >
            <div className="flex flex-wrap gap-8 md:gap-16 text-sm text-muted-foreground">
              <div>
                <span className="block font-serif text-3xl md:text-4xl text-foreground mb-1">500+</span>
                Style transformations
              </div>
              <div>
                <span className="block font-serif text-3xl md:text-4xl text-foreground mb-1">50+</span>
                Expert advisors
              </div>
              <div>
                <span className="block font-serif text-3xl md:text-4xl text-foreground mb-1">4.9</span>
                Average rating
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;