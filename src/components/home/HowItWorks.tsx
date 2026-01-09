import { motion } from "framer-motion";

const steps = [
  { number: "01", title: "Browse Advisors", description: "Explore our curated selection of style professionals." },
  { number: "02", title: "Book a Session", description: "Schedule a virtual or in-person consultation." },
  { number: "03", title: "Transform Your Style", description: "Receive personalized guidance for your wardrobe." },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">How It Works</h2>
          <p className="font-sans text-muted-foreground max-w-xl mx-auto">A simple process to achieve your style goals.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, index) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} className="text-center">
              <span className="font-sans text-sm text-muted-foreground mb-4 block">{step.number}</span>
              <h3 className="font-serif text-xl font-medium mb-3">{step.title}</h3>
              <p className="font-sans text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
