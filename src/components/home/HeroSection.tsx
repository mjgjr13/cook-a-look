import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-fashion.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Full-width beige gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(45,40%,96%)] via-[hsl(45,30%,92%)] to-[hsl(40,25%,85%)]" />
      
      {/* Background Image */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 flex justify-end">
          <img
            src={heroImage}
            alt="Elegant fashion consultant"
            className="h-full w-auto max-w-[60%] object-cover object-top"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(45,40%,96%)] via-[hsl(45,35%,94%)]/90 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-8"
          >
            Your Personal{" "}
            <span className="italic">Style Journey</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-sans text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg"
          >
            Connect with world-class style advisors who will transform your
            wardrobe and elevate your personal style to new heights.
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
