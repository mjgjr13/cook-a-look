import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Trophy, 
  DollarSign, 
  Clock, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Instagram,
  Link as LinkIcon,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  advisorApplicationSchema, 
  nameSchema,
  emailSchema,
  specialtySchema,
  bioSchema,
  instagramSchema,
  passwordSchema
} from "@/lib/validations";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const steps = [
  { number: 1, title: "Personal Info" },
  { number: 2, title: "Social & Portfolio" },
  { number: 3, title: "Review" },
];

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  instagram?: string;
  portfolio?: string;
  agreeTerms?: string;
}

const BecomeAdvisor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    specialty: "",
    experience: "",
    bio: "",
    virtual: true,
    inPerson: false,
    instagram: "",
    tiktok: "",
    linkedin: "",
    portfolio: "",
    agreeTerms: false,
  });

  // Pre-fill if user is already logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [user]);

  const validateField = (field: string, value: unknown): string | undefined => {
    try {
      switch (field) {
        case 'firstName':
        case 'lastName':
          nameSchema.parse(value);
          break;
        case 'email':
          emailSchema.parse(value);
          break;
        case 'password':
          if (!user) passwordSchema.parse(value);
          break;
        case 'specialty':
          specialtySchema.parse(value);
          break;
        case 'bio':
          bioSchema.parse(value);
          break;
        case 'instagram':
          instagramSchema.parse(value);
          break;
        case 'portfolio':
          if (value && typeof value === 'string' && value.trim()) {
            z.string().url().parse(value);
          }
          break;
      }
      return undefined;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return err.errors[0]?.message;
      }
      return "Invalid input";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password for new users
    if (!user) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) {
        setErrors((prev) => ({ ...prev, password: passwordError }));
        toast({
          title: "Validation Error",
          description: passwordError,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate all fields
    try {
      advisorApplicationSchema.parse({
        ...formData,
        password: user ? "placeholder" : formData.password, // Skip password validation for logged-in users
        agreeTerms: formData.agreeTerms as true,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        err.errors.forEach((error) => {
          const path = error.path[0] as keyof FormErrors;
          newErrors[path] = error.message;
        });
        setErrors(newErrors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      let userId = user?.id;

      // Step 1: Create Supabase Auth user if not logged in
      if (!user) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: {
            data: {
              full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            },
          },
        });

        if (signUpError) {
          console.error("Signup error:", signUpError);
          
          if (signUpError.message.includes("already registered") || 
              signUpError.message.includes("already exists")) {
            toast({
              title: "Email Already Registered",
              description: "Please sign in first, then apply to become an advisor.",
              variant: "destructive",
            });
            navigate("/signin?redirect=/become-advisor");
            return;
          }
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error("Failed to create account");
        }

        userId = signUpData.user.id;

        // Sign in immediately if not auto-signed in
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          await supabase.auth.signInWithPassword({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          });
        }
      }

      if (!userId) {
        throw new Error("No user ID available");
      }

      // Step 2: Wait for profile trigger, then update with role = 'advisor'
      await new Promise(resolve => setTimeout(resolve, 500));

      const instagramHandle = formData.instagram.startsWith("@") 
        ? formData.instagram.slice(1) 
        : formData.instagram;

      // Update or create profile with role = 'advisor'
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            role: "advisor",
            is_advisor: true,
            advisor_approved: false,
            advisor_status: "pending",
            specialty: formData.specialty.trim(),
            bio: formData.bio.trim(),
            instagram_url: instagramHandle,
            virtual_available: formData.virtual,
            in_person_available: formData.inPerson,
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            email: formData.email.trim().toLowerCase(),
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            role: "advisor",
            is_advisor: true,
            advisor_approved: false,
            advisor_status: "pending",
            specialty: formData.specialty.trim(),
            bio: formData.bio.trim(),
            instagram_url: instagramHandle,
            virtual_available: formData.virtual,
            in_person_available: formData.inPerson,
          });

        if (insertError) throw insertError;
      }

      // Step 3: Create advisor_profiles with status = 'applied'
      const { error: advisorProfileError } = await supabase
        .from("advisor_profiles")
        .upsert({
          user_id: userId,
          status: "applied",
          is_published: false,
          bio: formData.bio.trim(),
          specialties: [formData.specialty.trim()],
        }, {
          onConflict: "user_id",
        });

      if (advisorProfileError) {
        console.error("Advisor profile error:", advisorProfileError);
        // Continue - main profile is set up
      }

      // Step 4: Create advisor_applications record
      const { error: applicationError } = await supabase
        .from("advisor_applications")
        .insert({
          user_id: userId,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone?.trim() || null,
          specialty: formData.specialty.trim(),
          experience: formData.experience?.trim() || null,
          bio: formData.bio.trim(),
          virtual: formData.virtual,
          in_person: formData.inPerson,
          instagram: instagramHandle,
          tiktok: formData.tiktok?.trim() || null,
          linkedin: formData.linkedin?.trim() || null,
          portfolio: formData.portfolio?.trim() || null,
          status: "pending",
          liveness_verified: true,
        });

      if (applicationError) {
        console.error("Application error:", applicationError);
        // Continue - main profile is set up
      }

      toast({
        title: "Application Submitted!",
        description: "Redirecting to your advisor dashboard...",
      });

      // Navigate to advisor dashboard - they'll see "Under Review" status
      navigate("/advisor");

    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast({
        title: "Submission Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const nextStep = () => {
    const stepErrors: FormErrors = {};
    
    if (currentStep === 1) {
      stepErrors.firstName = validateField('firstName', formData.firstName);
      stepErrors.lastName = validateField('lastName', formData.lastName);
      stepErrors.email = validateField('email', formData.email);
      if (!user) {
        stepErrors.password = validateField('password', formData.password);
      }
      stepErrors.specialty = validateField('specialty', formData.specialty);
      stepErrors.bio = validateField('bio', formData.bio);
    } else if (currentStep === 2) {
      stepErrors.instagram = validateField('instagram', formData.instagram);
      if (formData.portfolio) {
        stepErrors.portfolio = validateField('portfolio', formData.portfolio);
      }
    }

    const hasErrors = Object.values(stepErrors).some(error => error !== undefined);
    if (hasErrors) {
      setErrors(stepErrors);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };
  
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        const hasBasicFields = formData.firstName && formData.lastName && formData.email && formData.specialty && formData.bio;
        const hasPassword = user || formData.password;
        const noErrors = !errors.firstName && !errors.lastName && !errors.email && !errors.password && !errors.specialty && !errors.bio;
        return hasBasicFields && hasPassword && noErrors;
      case 2:
        return formData.instagram && !errors.instagram && !errors.portfolio;
      case 3:
        return formData.agreeTerms;
      default:
        return false;
    }
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
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6">
              Become a Style Advisor
            </h1>
            <p className="font-sans text-primary-foreground/80 text-lg">
              Share your passion for fashion and help clients discover their
              personal style. Join our curated community of professional stylists.
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
        <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
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
                Complete the application below. We review every submission carefully.
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-sans text-sm font-medium transition-colors ${
                          currentStep >= step.number
                            ? "bg-gold text-accent-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {currentStep > step.number ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <span className="mt-2 text-xs font-sans text-muted-foreground hidden md:block">
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-12 md:w-24 mx-2 transition-colors ${
                          currentStep > step.number ? "bg-gold" : "bg-secondary"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className={errors.firstName ? "border-destructive" : ""}
                          required
                        />
                        {errors.firstName && (
                          <p className="text-xs text-destructive">{errors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className={errors.lastName ? "border-destructive" : ""}
                          required
                        />
                        {errors.lastName && (
                          <p className="text-xs text-destructive">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? "border-destructive" : ""}
                        disabled={!!user}
                        required
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                      {user && (
                        <p className="text-xs text-muted-foreground">Logged in as {user.email}</p>
                      )}
                    </div>

                    {!user && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleInputChange}
                            className={errors.password ? "border-destructive pr-10" : "pr-10"}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          At least 8 characters with uppercase, lowercase, and number
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="specialty">Style Specialty *</Label>
                      <Input
                        id="specialty"
                        name="specialty"
                        placeholder="e.g., Corporate, Casual, Streetwear"
                        value={formData.specialty}
                        onChange={handleInputChange}
                        className={errors.specialty ? "border-destructive" : ""}
                        required
                      />
                      {errors.specialty && (
                        <p className="text-xs text-destructive">{errors.specialty}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio *</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Tell clients about your style philosophy and experience..."
                        value={formData.bio}
                        onChange={handleInputChange}
                        className={`min-h-[120px] ${errors.bio ? "border-destructive" : ""}`}
                        required
                      />
                      {errors.bio && (
                        <p className="text-xs text-destructive">{errors.bio}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label>Session Types</Label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={formData.virtual}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, virtual: !!checked })
                            }
                          />
                          <span className="text-sm">Virtual Sessions</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={formData.inPerson}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, inPerson: !!checked })
                            }
                          />
                          <span className="text-sm">In-Person Sessions</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Social & Portfolio */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" />
                        Instagram Handle *
                      </Label>
                      <Input
                        id="instagram"
                        name="instagram"
                        placeholder="@yourusername"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        className={errors.instagram ? "border-destructive" : ""}
                        required
                      />
                      {errors.instagram && (
                        <p className="text-xs text-destructive">{errors.instagram}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolio" className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Portfolio Website (Optional)
                      </Label>
                      <Input
                        id="portfolio"
                        name="portfolio"
                        type="url"
                        placeholder="https://yourportfolio.com"
                        value={formData.portfolio}
                        onChange={handleInputChange}
                        className={errors.portfolio ? "border-destructive" : ""}
                      />
                      {errors.portfolio && (
                        <p className="text-xs text-destructive">{errors.portfolio}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="bg-card border border-border p-6 space-y-4">
                      <h3 className="font-serif text-lg font-medium">Application Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Specialty</p>
                          <p className="font-medium">{formData.specialty}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Instagram</p>
                          <p className="font-medium">{formData.instagram}</p>
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, agreeTerms: !!checked })
                        }
                        className="mt-1"
                      />
                      <span className="text-sm text-muted-foreground">
                        I agree to the{" "}
                        <Link to="/terms" className="text-primary underline">
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" className="text-primary underline">
                          Privacy Policy
                        </Link>
                        . I understand that my application will be reviewed before approval.
                      </span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={!canProceed() || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default BecomeAdvisor;
