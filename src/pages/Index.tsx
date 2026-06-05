import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeaturedAdvisors from "@/components/home/FeaturedAdvisors";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import AdvisorChatbot from "@/components/chat/AdvisorChatbot";
import Seo from "@/components/Seo";

const Index = () => {
  return (
    <Layout>
      <Seo
        title="Cook A Look | Personal Styling Marketplace"
        description="Connect with professional style advisors who transform your wardrobe. Book virtual or in-person fashion consultations today."
        path="/"
      />
      <HeroSection />
      <FeaturedAdvisors />
      <HowItWorks />
      <CTASection />
      <AdvisorChatbot />
    </Layout>
  );
};

export default Index;
