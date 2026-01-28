import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeaturedAdvisors from "@/components/home/FeaturedAdvisors";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import AdvisorChatbot from "@/components/chat/AdvisorChatbot";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturedAdvisors />
      <HowItWorks />
      <CTASection />
      <AdvisorChatbot />
    </Layout>
  );
};

export default Index;
