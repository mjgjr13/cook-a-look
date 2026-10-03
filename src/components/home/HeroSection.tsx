import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Video, Lock, ShieldCheck } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Seamless full-width background */}
      <div className="absolute inset-0 bg-cream" />
      
      {/* Background Image with seamless gradient overlay */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 bottom-0 w-[65%]">
          <img
            src="/images/hero-fashion.jpg"
            alt="Elegant fashion consultant"
            className="h-full w-full object-cover object-top"
            width={1600}
            height={1067}
            fetchPriority="high"
            decoding="async"
          />
        </div>
        {/* Seamless gradient overlay - extends fully to the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/95 via-40% to-cream/20" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl">
          <h1 className="sr-only">Cook A Look — Discover your personal style with expert advisors</h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-8"
            aria-hidden="true"
          >
            Discover your{" "}
            <span className="italic">personal style</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-sans text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg"
          >
            Book a one-on-one session with a personal style advisor, by video
            from anywhere or in person, and leave with a wardrobe plan that
            feels like you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/advisors">Find Your Advisor</Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/lookbook">Explore Lookbook</Link>
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2 text-sm font-sans text-muted-foreground"
          >
            <li className="flex items-center gap-2"><Video className="w-4 h-4 text-gold" aria-hidden="true" />Video or in-person sessions</li>
            <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-gold" aria-hidden="true" />Secure checkout with Stripe</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" aria-hidden="true" />Payment protected until after your session</li>
          </motion.ul>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
