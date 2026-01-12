import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  return (
    <section className="min-h-[85vh] flex items-center justify-center bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <img 
              src={logo} 
              alt="Cook a Look" 
              className="h-24 md:h-32 lg:h-40 w-auto mx-auto"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-8"
          >
            Elevate your personal style.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-sans text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto"
          >
            Connect with expert style advisors who will help you build a 
            wardrobe that reflects who you are.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="default" size="lg" asChild>
              <Link to="/advisors">Find Your Advisor</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/lookbook">View Lookbook</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
