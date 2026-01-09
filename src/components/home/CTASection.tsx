import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
            Join Our Community
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6">
            Become a Style Advisor
          </h2>
          <p className="font-sans text-primary-foreground/80 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Share your passion for fashion and build your client base on our
            platform. Set your own rates, choose your availability, and connect
            with clients who appreciate your unique style perspective.
          </p>
          <Button
            variant="gold"
            size="xl"
            asChild
            className="hover:scale-105 transition-transform"
          >
            <Link to="/become-advisor">Start Your Journey</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
