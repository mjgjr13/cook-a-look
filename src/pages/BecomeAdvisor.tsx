import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { CheckCircle, Trophy, DollarSign, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const benefits = [
  {
    icon: DollarSign,
    title: "Set Your Own Rates",
    description: "You control your pricing. Earn what you're worth.",
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description: "Work when you want, offer virtual or in-person sessions.",
  },
  {
    icon: Users,
    title: "Build Your Clientele",
    description: "Reach clients actively seeking style guidance.",
  },
  {
    icon: Trophy,
    title: "Loyalty Rewards",
    description: "Reduced fees after 10 bookings. Grow and save.",
  },
];

const BecomeAdvisor = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialty: "",
    experience: "",
    bio: "",
    virtual: false,
    inPerson: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application Submitted",
      description: "We'll review your application and get back to you within 2-3 business days.",
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
              Join Our Network
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6">
              Become a Style Advisor
            </h1>
            <p className="font-sans text-primary-foreground/80 text-lg">
              Share your passion for fashion and help clients discover their
              personal style. Join our community of professional stylists.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-background border border-border mb-4">
                  <benefit.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">
                  {benefit.title}
                </h3>
                <p className="font-sans text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl font-medium mb-4">
                Apply to Join
              </h2>
              <p className="font-sans text-muted-foreground">
                Fill out the form below and our team will review your
                application.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Style Specialty</Label>
                <Input
                  id="specialty"
                  name="specialty"
                  placeholder="e.g., Menswear, Occasion Styling, Color Analysis"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  placeholder="e.g., 5 years"
                  value={formData.experience}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Tell Us About Yourself</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder="Describe your background, style philosophy, and what makes you unique..."
                  rows={5}
                  value={formData.bio}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Consultation Types</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="virtual"
                      checked={formData.virtual}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, virtual: checked as boolean })
                      }
                    />
                    <Label htmlFor="virtual" className="font-normal cursor-pointer">
                      Virtual Consultations
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inPerson"
                      checked={formData.inPerson}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, inPerson: checked as boolean })
                      }
                    />
                    <Label htmlFor="inPerson" className="font-normal cursor-pointer">
                      In-Person Consultations
                    </Label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="hero" size="lg" type="submit" className="w-full">
                  Submit Application
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground font-sans">
                By submitting, you agree to our Terms of Service and acknowledge
                that all profiles are subject to approval.
              </p>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default BecomeAdvisor;
