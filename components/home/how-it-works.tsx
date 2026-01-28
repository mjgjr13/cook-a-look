"use client"

import { motion } from "framer-motion"
import { Search, Calendar, Sparkles } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "Browse Advisors",
    description:
      "Explore our curated directory of professional style advisors. Filter by specialty, price, and availability.",
  },
  {
    icon: Calendar,
    title: "Book a Session",
    description:
      "Choose between virtual or in-person consultations. Select a time that works for you and book instantly.",
  },
  {
    icon: Sparkles,
    title: "Transform Your Style",
    description:
      "Work with your advisor to create personalized looks and receive expert guidance on building your wardrobe.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
            Simple Process
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            How It Works
          </h2>
          <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
            Your style transformation is just three steps away
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card border border-border mb-6">
                <step.icon className="w-7 h-7 text-gold" />
              </div>
              <div className="font-sans text-sm text-gold tracking-[0.2em] uppercase mb-2">
                Step {index + 1}
              </div>
              <h3 className="font-serif text-2xl font-medium mb-3">
                {step.title}
              </h3>
              <p className="font-sans text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
