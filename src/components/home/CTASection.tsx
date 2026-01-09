import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-24 bg-background border-t border-border">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">Share Your Expertise</h2>
          <p className="font-sans text-muted-foreground mb-8 leading-relaxed">Are you a fashion professional? Join our network of style advisors.</p>
          <Button variant="default" size="lg" asChild>
            <Link to="/become-advisor">Apply Now</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
