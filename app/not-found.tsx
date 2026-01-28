"use client"

import Link from "next/link"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function NotFound() {
  return (
    <LayoutWrapper>
      <section className="py-24 bg-background min-h-[70vh] flex items-center">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-lg mx-auto"
          >
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
              Error 404
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6">
              Page Not Found
            </h1>
            <p className="font-sans text-muted-foreground mb-10 leading-relaxed">
              The page you are looking for might have been removed, had its name
              changed, or is temporarily unavailable.
            </p>
            <Button
              className="bg-primary text-primary-foreground hover:bg-charcoal uppercase tracking-widest font-medium rounded-none border-2 border-primary hover:border-charcoal h-14 px-10 py-4 text-base"
              asChild
            >
              <Link href="/">Return Home</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </LayoutWrapper>
  )
}
