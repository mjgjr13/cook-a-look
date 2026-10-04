import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeaturedAdvisors from "@/components/home/FeaturedAdvisors";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import FAQSection, { FAQ_ITEMS } from "@/components/home/FAQSection";
import Seo from "@/components/Seo";

const Index = () => {
  return (
    <Layout>
      <Seo
        title="Cook A Look | Book a Personal Style Advisor"
        description="Book a one-on-one session with an independent style advisor, by video or in person. Get advice on outfits, fit, and what to buy."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <HeroSection />
      <FeaturedAdvisors />
      <HowItWorks />
      <FAQSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
