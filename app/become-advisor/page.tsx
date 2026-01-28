"use client"

import Link from "next/link"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CheckCircle, DollarSign, Calendar, Users } from "lucide-react"

const benefits = [
  {
    icon: DollarSign,
    title: "Set Your Own Rates",
    description: "Control your pricing and earn what you deserve for your expertise.",
  },
  {
    icon: Calendar,
    title: "Flexible Schedule",
    description: "Work when it suits you. Set your availability and manage bookings easily.",
  },
  {
    icon: Users,
    title: "Grow Your Client Base",
    description: "Connect with clients who are actively seeking style guidance.",
  },
]

const requirements = [
  "Professional experience in fashion, styling, or related field",
  "Strong communication and interpersonal skills",
  "Reliable internet connection for virtual consultations",
  "Commitment to providing excellent client service",
]

export default function BecomeAdvisorPage() {
  return (
    <LayoutWrapper>
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
              Join Our Network
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium mb-6 text-balance">
              Become a Style Advisor
            </h1>
            <p className="font-sans text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Share your passion for fashion and help others discover their unique style. 
              Join our community of professional style advisors.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
          >
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="text-center p-8 bg-card border border-border"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background border border-border mb-6">
                  <benefit.icon className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-serif text-xl font-medium mb-3">
                  {benefit.title}
                </h3>
                <p className="font-sans text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-card border border-border p-8 md:p-12">
              <h2 className="font-serif text-2xl font-medium mb-6 text-center">
                Requirements
              </h2>
              <ul className="space-y-4 mb-10">
                {requirements.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                    <span className="font-sans text-muted-foreground">
                      {requirement}
                    </span>
                  </li>
                ))}
              </ul>
              
              <div className="text-center">
                <Button
                  className="bg-gold text-accent-foreground hover:bg-gold-light uppercase tracking-widest font-medium rounded-none h-14 px-10 py-4 text-base"
                  asChild
                >
                  <Link href="/signup?role=advisor">Apply Now</Link>
                </Button>
                <p className="font-sans text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link href="/signin" className="text-foreground hover:text-gold transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </LayoutWrapper>
  )
}
