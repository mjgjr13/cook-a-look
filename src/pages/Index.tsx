import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import FeaturedAdvisors from "@/components/home/FeaturedAdvisors";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturedAdvisors />
      <HowItWorks />
      <CTASection />
    </Layout>
  );
};

export default Index;
