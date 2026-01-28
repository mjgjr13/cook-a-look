"use client"

import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { HeroSection } from "@/components/home/hero-section"
import { FeaturedAdvisors } from "@/components/home/featured-advisors"
import { HowItWorks } from "@/components/home/how-it-works"
import { CTASection } from "@/components/home/cta-section"
import { AdvisorChatbot } from "@/components/chat/advisor-chatbot"

export default function HomePage() {
  return (
    <LayoutWrapper>
      <HeroSection />
      <FeaturedAdvisors />
      <HowItWorks />
      <CTASection />
      <AdvisorChatbot />
    </LayoutWrapper>
  )
}
