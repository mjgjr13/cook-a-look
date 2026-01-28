"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-cream" />
      
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 bottom-0 w-[65%]">
          <Image
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&auto=format&fit=crop&q=80"
            alt="Elegant fashion consultant"
            fill
            className="object-cover object-top"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/95 via-40% to-cream/20" />
      </div>

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-8"
          >
            Discover your{" "}
            <span className="italic">personal style</span>
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
            <Button 
              className="bg-primary text-primary-foreground hover:bg-charcoal uppercase tracking-widest font-medium rounded-none border-2 border-primary hover:border-charcoal h-14 px-10 py-4 text-base"
              asChild
            >
              <Link href="/advisors">Find Your Advisor</Link>
            </Button>
            <Button 
              className="bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest font-medium rounded-none h-14 px-10 py-4 text-base"
              asChild
            >
              <Link href="/lookbook">Explore Lookbook</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
