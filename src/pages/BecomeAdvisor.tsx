import { useState } from "react";
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
  Camera,
  Shield,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  advisorApplicationSchema, 
  validateFile,
  nameSchema,
  emailSchema,
  specialtySchema,
  bioSchema,
  instagramSchema,
  passwordSchema
} from "@/lib/validations";
import { z } from "zod";
import LivenessCamera from "@/components/LivenessCamera";
import { supabase } from "@/integrations/supabase/client";
import LocationAutocomplete from "@/components/ui/location-autocomplete";
import ExperienceSelect from "@/components/advisor/ExperienceSelect";
import PricingInput from "@/components/advisor/PricingInput";
import IDUploadWithCamera from "@/components/advisor/IDUploadWithCamera";

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
  { number: 3, title: "Verification" },
  { number: 4, title: "Review & Pricing" },
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
  profilePhotoFile?: string;
  selfieFile?: string;
  idFile?: string;
  agreeTerms?: string;
  consultationType?: string;
  experience?: string;
  location?: string;
  price?: string;
}

const BecomeAdvisor = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
    location: "",
    bio: "",
    virtual: false,
    inPerson: false,
    instagram: "",
    tiktok: "",
    linkedin: "",
    portfolio: "",
    price: "",
    // Profile photo for step 2
    profilePhotoFile: null as File | null,
    profilePhotoPreview: "",
    // Verification photos for step 3
    selfieFile: null as File | null,
    selfiePreview: "",
    livenessVerified: false,
    idFile: null as File | null,
    idPreview: "",
    agreeTerms: false,
  });

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
          passwordSchema.parse(value);
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
    
    // Validate password before other fields
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
    
    // Validate all fields before submission
    try {
      advisorApplicationSchema.parse({
        ...formData,
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

    // MVP: Skip file validation - files are optional for testing
    // In production, uncomment this validation
    /*
    const selfieError = validateFile(formData.selfieFile);
    const idError = validateFile(formData.idFile);
    
    if (selfieError || idError) {
      setErrors({
        ...errors,
        selfieFile: selfieError || undefined,
        idFile: idError || undefined,
      });
      toast({
        title: "File Validation Error",
        description: selfieError || idError,
        variant: "destructive",
      });
      return;
    }
    */

    setIsSubmitting(true);
    
    try {
      // Step 1: Create the Supabase Auth user
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
        
        // Check for existing user error - offer to sign in and upgrade
        if (signUpError.message.includes("already registered") || 
            signUpError.message.includes("already exists") ||
            signUpError.message.includes("User already registered")) {
          toast({
            title: "Email Already Registered",
            description: "Please sign in first, then apply to become an advisor from your dashboard.",
            variant: "destructive",
          });
          navigate("/signin?redirect=/become-advisor");
        } else {
          toast({
            title: "Account Creation Failed",
            description: signUpError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (!signUpData.user) {
        toast({
          title: "Account Creation Failed",
          description: "Unable to create account. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const userId = signUpData.user.id;
      console.log("User created:", userId);

      // Step 2: Get the session (user should be signed in after signup with auto-confirm)
      let { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // Try signing in if session wasn't automatically established
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });

        if (signInError) {
          console.error("Auto sign-in error:", signInError);
          toast({
            title: "Sign In Required",
            description: "Account created but sign-in failed. Please sign in to complete your application.",
            variant: "destructive",
          });
          navigate("/signin?redirect=/advisor");
          return;
        }
        
        // Get session again after sign in
        const { data: newSession } = await supabase.auth.getSession();
        sessionData = newSession;
      }

      console.log("Session established, uploading profile photo and updating profile...");

      // Step 3: Upload profile photo if provided
      let avatarUrl: string | null = null;
      if (formData.profilePhotoFile) {
        try {
          const fileExt = formData.profilePhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, formData.profilePhotoFile, {
              upsert: true,
              contentType: formData.profilePhotoFile.type,
            });

          if (uploadError) {
            console.error("Avatar upload error:", uploadError);
            // Don't fail the whole process, continue without avatar
          } else {
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(fileName);
            avatarUrl = urlData.publicUrl;
            console.log("Avatar uploaded:", avatarUrl);
          }
        } catch (err) {
          console.error("Error uploading avatar:", err);
        }
      }

      // Step 4: Wait for profile trigger to create base profile, then update it
      // The handle_new_user trigger creates a basic profile - we need to update it
      let retries = 0;
      const maxRetries = 5;
      let profileUpdated = false;

      while (retries < maxRetries && !profileUpdated) {
        // Small delay to allow trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingProfile) {
          // Profile exists, update it with advisor data
          const instagramHandle = formData.instagram.startsWith("@") 
            ? formData.instagram.slice(1) 
            : formData.instagram;

          const updateData: Record<string, unknown> = {
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            is_advisor: true,
            advisor_approved: false,
            advisor_status: "pending",
            specialty: formData.specialty.trim(),
            bio: formData.bio.trim(),
            instagram_url: instagramHandle,
            virtual_available: formData.virtual,
            in_person_available: formData.inPerson,
            location: formData.location.trim(),
            experience_years: formData.experience === "10+" ? 10 : parseInt(formData.experience.split("-")[0]) || null,
            price_per_session: parseFloat(formData.price) || null,
          };

          if (avatarUrl) {
            updateData.avatar_url = avatarUrl;
          }

          const { error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("user_id", userId);

          if (updateError) {
            console.error("Profile update error:", updateError);
            throw new Error("Failed to set up advisor profile");
          }

          profileUpdated = true;
          console.log("Profile updated with advisor data");
        } else if (profileError) {
          console.error("Profile fetch error:", profileError);
        }

        retries++;
      }

      if (!profileUpdated) {
        // Profile trigger may have failed, create profile directly
        const instagramHandle = formData.instagram.startsWith("@") 
          ? formData.instagram.slice(1) 
          : formData.instagram;

        const insertData: Record<string, unknown> = {
          user_id: userId,
          email: formData.email.trim().toLowerCase(),
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          is_advisor: true,
          advisor_approved: false,
          advisor_status: "pending",
          specialty: formData.specialty.trim(),
          bio: formData.bio.trim(),
          instagram_url: instagramHandle,
          virtual_available: formData.virtual,
          in_person_available: formData.inPerson,
          location: formData.location.trim(),
          experience_years: formData.experience === "10+" ? 10 : parseInt(formData.experience.split("-")[0]) || null,
          price_per_session: parseFloat(formData.price) || null,
        };

        if (avatarUrl) {
          insertData.avatar_url = avatarUrl;
        }

        const { error: insertError } = await supabase
          .from("profiles")
          .insert(insertData);

        if (insertError) {
          console.error("Profile insert error:", insertError);
          throw new Error("Failed to create advisor profile");
        }
        console.log("Profile created directly");
      }

      // Step 5: Create advisor application record
      const instagramHandle = formData.instagram.startsWith("@") 
        ? formData.instagram.slice(1) 
        : formData.instagram;

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
          liveness_verified: true, // MVP: Skip verification
        });

      if (applicationError) {
        console.error("Application insert error:", applicationError);
        // Don't fail entirely - profile is set up, application can be re-submitted
        toast({
          title: "Partial Success",
          description: "Your advisor account is created. Application details may need to be resubmitted.",
          variant: "destructive",
        });
      }

      // Step 5: Add user role (for role-based access)
      await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "user" as const,
        }, {
          onConflict: "user_id,role",
          ignoreDuplicates: true,
        });

      console.log("Advisor signup complete, sending confirmation email...");

      // Send confirmation email
      try {
        await supabase.functions.invoke("send-advisor-confirmation", {
          body: {
            email: formData.email.trim().toLowerCase(),
            firstName: formData.firstName.trim(),
            specialty: formData.specialty.trim(),
          },
        });
        console.log("Confirmation email sent");
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
        // Don't block the signup process if email fails
      }

      // Success! Navigate immediately to advisor dashboard
      toast({
        title: "Welcome, Advisor!",
        description: "Your account has been created. Check your email for confirmation.",
      });

      // Navigate to advisor dashboard immediately
      navigate("/advisor");

    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast({
        title: "Submission Failed",
        description: err.message || "An unexpected error occurred. Please try again.",
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
    
    // Clear error and validate on change
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'selfieFile' | 'idFile') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const fileError = validateFile(file);
      if (fileError) {
        setErrors((prev) => ({ ...prev, [field]: fileError }));
        toast({
          title: "Invalid File",
          description: fileError,
          variant: "destructive",
        });
        return;
      }

      const previewField = field === 'selfieFile' ? 'selfiePreview' : 'idPreview';
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ 
          ...formData, 
          [field]: file,
          [previewField]: reader.result as string
        });
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const stepErrors: FormErrors = {};
    
    if (currentStep === 1) {
      stepErrors.firstName = validateField('firstName', formData.firstName);
      stepErrors.lastName = validateField('lastName', formData.lastName);
      stepErrors.email = validateField('email', formData.email);
      stepErrors.password = validateField('password', formData.password);
      stepErrors.specialty = validateField('specialty', formData.specialty);
      stepErrors.bio = validateField('bio', formData.bio);
      
      // Validate consultation type - at least one must be selected
      if (!formData.virtual && !formData.inPerson) {
        stepErrors.consultationType = "Please select at least one consultation type";
      }
      
      // Validate experience
      if (!formData.experience) {
        stepErrors.experience = "Please select your experience level";
      }
      
      // Validate location
      if (!formData.location || formData.location.trim().length < 2) {
        stepErrors.location = "Location is required";
      }
    } else if (currentStep === 2) {
      stepErrors.instagram = validateField('instagram', formData.instagram);
      if (formData.portfolio) {
        stepErrors.portfolio = validateField('portfolio', formData.portfolio);
      }
      // Require profile photo
      if (!formData.profilePhotoPreview) {
        stepErrors.profilePhotoFile = "Profile photo is required";
      }
    } else if (currentStep === 4) {
      // Validate price in review step
      const priceNum = parseFloat(formData.price);
      if (!formData.price || isNaN(priceNum) || priceNum < 25) {
        stepErrors.price = "Please set a session rate (minimum $25)";
      }
    }

    const hasErrors = Object.values(stepErrors).some(error => error !== undefined);
    if (hasErrors) {
      setErrors(stepErrors);
      toast({
        title: "Please complete all required fields",
        description: Object.values(stepErrors).filter(Boolean)[0],
        variant: "destructive",
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };
  
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && formData.password && 
               formData.specialty && formData.bio && formData.experience && formData.location &&
               (formData.virtual || formData.inPerson) &&
               !errors.firstName && !errors.lastName && !errors.email && !errors.password && 
               !errors.specialty && !errors.bio && !errors.experience && !errors.location;
      case 2:
        // Require profile photo AND instagram
        return formData.instagram && formData.profilePhotoPreview && !errors.instagram && !errors.portfolio;
      case 3:
        // MVP: Verification is optional - always allow proceeding
        return true;
      case 4:
        const priceNum = parseFloat(formData.price);
        return formData.agreeTerms && formData.price && !isNaN(priceNum) && priceNum >= 25;
      default:
        return false;
    }
  };

  if (isSubmitted) {
    return (
      <Layout>
        <section className="py-24 bg-background min-h-[80vh] flex items-center">
          <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold/20 mb-8">
                <CheckCircle className="w-10 h-10 text-gold" />
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6">
                Application Submitted
              </h1>
              <p className="font-sans text-lg text-muted-foreground mb-4">
                Thank you for your interest in becoming a Cook a Look advisor.
              </p>
              <div className="bg-card border border-border p-6 mb-8">
                <p className="font-sans text-foreground">
                  Your application is now <span className="font-medium text-gold">under review</span>. 
                  Our team typically responds within <span className="font-medium">2–5 business days</span>.
                </p>
              </div>
              <p className="font-sans text-sm text-muted-foreground mb-8">
                A confirmation email has been sent to <span className="font-medium">{formData.email}</span>. 
                Please check your inbox (and spam folder) for next steps.
              </p>
              <Button variant="outline" asChild>
                <a href="/">Return to Home</a>
              </Button>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

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
                Complete the application below. We review every submission carefully to maintain our high standards.
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={errors.email ? "border-destructive" : ""}
                          required
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>
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
                        {errors.password ? (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive">{errors.phone}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="specialty">Style Specialty *</Label>
                        <Input
                          id="specialty"
                          name="specialty"
                          placeholder="e.g., Menswear, Occasion Styling"
                          value={formData.specialty}
                          onChange={handleInputChange}
                          className={errors.specialty ? "border-destructive" : ""}
                          required
                        />
                        {errors.specialty && (
                          <p className="text-xs text-destructive">{errors.specialty}</p>
                        )}
                      </div>
                      <ExperienceSelect
                        value={formData.experience}
                        onChange={(value) => {
                          setFormData({ ...formData, experience: value });
                          setErrors((prev) => ({ ...prev, experience: undefined }));
                        }}
                        error={errors.experience}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <LocationAutocomplete
                        value={formData.location}
                        onChange={(value) => {
                          setFormData({ ...formData, location: value });
                          setErrors((prev) => ({ ...prev, location: undefined }));
                        }}
                        placeholder="Enter your city"
                        error={!!errors.location}
                      />
                      {errors.location && (
                        <p className="text-xs text-destructive">{errors.location}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Tell Us About Yourself *</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Describe your background, style philosophy, and what makes you unique..."
                        rows={5}
                        value={formData.bio}
                        onChange={handleInputChange}
                        className={errors.bio ? "border-destructive" : ""}
                        required
                      />
                      {errors.bio && (
                        <p className="text-xs text-destructive">{errors.bio}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formData.bio.length}/2000 characters</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Consultation Types *</Label>
                        {errors.consultationType && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.consultationType}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="virtual"
                            checked={formData.virtual}
                            onCheckedChange={(checked) => {
                              setFormData({ ...formData, virtual: checked as boolean });
                              setErrors((prev) => ({ ...prev, consultationType: undefined }));
                            }}
                          />
                          <Label htmlFor="virtual" className="font-normal cursor-pointer">
                            Virtual Consultations
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="inPerson"
                            checked={formData.inPerson}
                            onCheckedChange={(checked) => {
                              setFormData({ ...formData, inPerson: checked as boolean });
                              setErrors((prev) => ({ ...prev, consultationType: undefined }));
                            }}
                          />
                          <Label htmlFor="inPerson" className="font-normal cursor-pointer">
                            In-Person Consultations
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select at least one. You can adjust your consultation types later from your dashboard.
                      </p>
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
                    {/* Profile Photo Upload - Required */}
                    <div className="space-y-4">
                      <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Camera className="w-5 h-5 text-gold mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Profile Photo Required *</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Upload a high-quality photo that best represents you — this is your first impression for clients.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-dashed border-border rounded-lg p-6">
                        {formData.profilePhotoPreview ? (
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img 
                                src={formData.profilePhotoPreview} 
                                alt="Profile preview" 
                                className="w-24 h-24 object-cover rounded-full border-2 border-primary"
                              />
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="text-sm font-medium text-primary">Photo uploaded</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, profilePhotoFile: null, profilePhotoPreview: "" })}
                              >
                                Change Photo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center gap-3 cursor-pointer">
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                              <Upload className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">Click to upload your profile photo</p>
                              <p className="text-xs text-muted-foreground mt-1">JPG or PNG, minimum 200×200 pixels, max 5MB</p>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validate file type
                                  if (!["image/jpeg", "image/png"].includes(file.type)) {
                                    toast({
                                      title: "Invalid file type",
                                      description: "Please upload a JPG or PNG image",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  // Validate file size (5MB max)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: "File too large",
                                      description: "Please upload an image smaller than 5MB",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData({ 
                                      ...formData, 
                                      profilePhotoFile: file,
                                      profilePhotoPreview: reader.result as string
                                    });
                                    setErrors((prev) => ({ ...prev, profilePhotoFile: undefined }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {errors.profilePhotoFile && (
                        <p className="text-xs text-destructive">{errors.profilePhotoFile}</p>
                      )}
                    </div>

                    <div className="bg-card border border-border p-4 mb-6">
                      <p className="font-sans text-sm text-muted-foreground">
                        <Instagram className="w-4 h-4 inline mr-2" />
                        We use your social profiles to verify your identity and review your body of work. 
                        This helps us maintain trust and quality on the platform.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram Handle *</Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="instagram"
                          name="instagram"
                          placeholder="@yourusername"
                          value={formData.instagram}
                          onChange={handleInputChange}
                          className={`pl-10 ${errors.instagram ? "border-destructive" : ""}`}
                          required
                        />
                      </div>
                      {errors.instagram ? (
                        <p className="text-xs text-destructive">{errors.instagram}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Required — your primary showcase of style work</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiktok">TikTok Handle (Optional)</Label>
                      <Input
                        id="tiktok"
                        name="tiktok"
                        placeholder="@yourusername"
                        value={formData.tiktok}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                      <Input
                        id="linkedin"
                        name="linkedin"
                        placeholder="linkedin.com/in/yourprofile"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio or Website (Optional)</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="portfolio"
                          name="portfolio"
                          placeholder="https://yourwebsite.com"
                          value={formData.portfolio}
                          onChange={handleInputChange}
                          className={`pl-10 ${errors.portfolio ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.portfolio ? (
                        <p className="text-xs text-destructive">{errors.portfolio}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Share a link to your portfolio, Behance, or personal website</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Verification */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <div className="bg-card border border-border p-4 mb-6">
                      <p className="font-sans text-sm text-muted-foreground">
                        <Shield className="w-4 h-4 inline mr-2" />
                        Verification keeps our community safe and builds trust with clients. 
                        Your documents are securely encrypted and never shared publicly.
                      </p>
                    </div>

                    {/* Selfie with Liveness Detection */}
                    <div className="space-y-4">
                      <Label>Profile Photo (Live Capture) *</Label>
                      <p className="text-sm text-muted-foreground">
                        Take a live photo using your camera. This verifies your identity and will be your public profile image.
                      </p>
                      {formData.selfiePreview ? (
                        <div className="border-2 border-green-500 rounded-lg p-6 text-center bg-green-500/5">
                          <div className="relative inline-block">
                            <img 
                              src={formData.selfiePreview} 
                              alt="Selfie preview" 
                              className="max-h-48 mx-auto rounded-lg"
                            />
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="text-sm text-green-600 mt-3 flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4" />
                            Liveness verified
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setFormData({ ...formData, selfieFile: null, selfiePreview: "" })}
                          >
                            Retake Photo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <LivenessCamera
                            onCapture={(blob, isVerified) => {
                              const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ 
                                  ...formData, 
                                  selfieFile: file,
                                  selfiePreview: reader.result as string,
                                  livenessVerified: isVerified
                                });
                                if (isVerified) {
                                  toast({
                                    title: "Liveness verified!",
                                    description: "Your photo has been captured successfully.",
                                  });
                                }
                              };
                              reader.readAsDataURL(blob);
                            }}
                            onCancel={() => {}}
                          />
                          
                          {/* Test Mode Bypass - Remove in production */}
                          <div className="border-2 border-dashed border-amber-500/50 rounded-lg p-4 bg-amber-500/5">
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                              <span className="font-semibold">⚠️ TEST MODE</span>
                              Skip camera verification for testing purposes only
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-amber-500 text-amber-600 hover:bg-amber-500/10"
                              onClick={() => {
                                // Create a placeholder file for test mode
                                const placeholderBlob = new Blob(['test-mode-placeholder'], { type: 'image/jpeg' });
                                const testFile = new File([placeholderBlob], "test-selfie.jpg", { type: "image/jpeg" });
                                
                                setFormData({
                                  ...formData,
                                  selfieFile: testFile,
                                  selfiePreview: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjOTk5Ij5UZXN0IE1vZGU8L3RleHQ+PC9zdmc+",
                                  livenessVerified: true, // Mark as verified for test mode
                                });
                                
                                toast({
                                  title: "Test Mode Activated",
                                  description: "Camera verification skipped. This will be flagged for manual review.",
                                  variant: "default",
                                });
                              }}
                            >
                              Skip for now (test mode)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>


                    {/* ID Upload with Camera Option */}
                    <IDUploadWithCamera
                      idPreview={formData.idPreview}
                      onCapture={(file, preview) => {
                        setFormData({ ...formData, idFile: file, idPreview: preview });
                      }}
                      onRemove={() => {
                        setFormData({ ...formData, idFile: null, idPreview: "" });
                      }}
                    />
                  </motion.div>
                )}

                {/* Step 4: Review & Pricing */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Pricing Section */}
                    <div className="bg-gold/5 border border-gold/20 rounded-lg p-6">
                      <h3 className="font-serif text-lg font-medium mb-4">Set Your Pricing</h3>
                      <PricingInput
                        value={formData.price}
                        onChange={(value) => {
                          setFormData({ ...formData, price: value });
                          setErrors((prev) => ({ ...prev, price: undefined }));
                        }}
                        error={errors.price}
                      />
                      <p className="text-xs text-muted-foreground mt-4">
                        You can adjust your pricing anytime from your dashboard settings.
                      </p>
                    </div>

                    <div className="bg-card border border-border p-6 space-y-4">
                      <h3 className="font-serif text-lg font-medium">Application Summary</h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{formData.email}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Specialty:</span>
                          <p className="font-medium">{formData.specialty}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Experience:</span>
                          <p className="font-medium">{formData.experience} years</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <p className="font-medium">{formData.location}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Instagram:</span>
                          <p className="font-medium">{formData.instagram}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Session Types:</span>
                          <p className="font-medium">
                            {[
                              formData.virtual && "Virtual",
                              formData.inPerson && "In-Person"
                            ].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        {formData.selfiePreview && (
                          <div>
                            <span className="text-xs text-muted-foreground block mb-2">Profile Photo</span>
                            <img 
                              src={formData.selfiePreview} 
                              alt="Profile" 
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {formData.idPreview && (
                          <div>
                            <span className="text-xs text-muted-foreground block mb-2">ID Uploaded</span>
                            <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                              <Shield className="w-8 h-8 text-gold" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-secondary rounded-lg">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, agreeTerms: checked as boolean })
                        }
                      />
                      <div>
                        <Label htmlFor="agreeTerms" className="font-normal cursor-pointer leading-relaxed">
                          I agree to the{" "}
                          <Link to="/terms" target="_blank" className="text-gold hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" target="_blank" className="text-gold hover:underline">
                            Privacy Policy
                          </Link>
                          . I confirm that all information provided is accurate and that I am authorized to work as a style consultant.
                        </Label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 pt-6 border-t border-border">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <Button 
                    type="button" 
                    variant="hero" 
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
                    size="lg"
                    disabled={!canProceed() || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
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
