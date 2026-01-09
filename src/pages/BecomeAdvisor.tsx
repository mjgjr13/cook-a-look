import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const benefits = [
  {
    title: "Set Your Own Rates",
    description: "You control your pricing.",
  },
  {
    title: "Flexible Schedule",
    description: "Work when you want.",
  },
  {
    title: "Build Your Clientele",
    description: "Reach clients seeking guidance.",
  },
  {
    title: "Loyalty Rewards",
    description: "Reduced fees after 10 bookings.",
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4">
              Become a Style Advisor
            </h1>
            <p className="font-sans text-muted-foreground">
              Share your expertise and help clients discover their personal style.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <h3 className="font-serif text-base font-medium mb-1">
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
        <div className="container mx-auto px-6 lg:px-8 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-10">
              <h2 className="font-serif text-2xl font-medium mb-2">
                Apply to Join
              </h2>
              <p className="font-sans text-sm text-muted-foreground">
                Fill out the form below and our team will review your application.
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
                  placeholder="e.g., Menswear, Occasion Styling"
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
                  placeholder="Describe your background and style philosophy..."
                  rows={4}
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
                <Button variant="default" size="lg" type="submit" className="w-full">
                  Submit Application
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground font-sans">
                By submitting, you agree to our Terms of Service.
              </p>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default BecomeAdvisor;
