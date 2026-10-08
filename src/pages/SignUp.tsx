import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { signUpSchema, type SignUpFormData } from "@/lib/validations";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInSection } from "@/components/auth/GoogleSignInButton";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";
import { getSafeRedirect } from "@/lib/safeRedirect";

const SignUp = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = getSafeRedirect(searchParams.get("redirect"));
  const redirectTo = redirectParam || "/dashboard";
  const isBookingFlow = !!redirectParam?.startsWith("/advisors/");
  const { signUp, user, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error when user starts typing
    if (errors[id as keyof SignUpFormData]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const result = signUpSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignUpFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SignUpFormData;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (containsProfanity(formData.firstName, formData.lastName)) {
      setErrors({ firstName: PROFANITY_MESSAGE });
      return;
    }

    setIsSubmitting(true);

    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const { error, session } = await signUp(formData.email, formData.password, fullName);

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else if (error.message.includes("Password")) {
          toast({
            title: "Password issue",
            description: error.message,
            variant: "destructive",
          });
        } else if (/sending confirmation email/i.test(error.message)) {
          toast({
            title: "Sign up failed",
            description: "We couldn't send your confirmation email. Please try again in a few minutes.",
            variant: "destructive",
          });
        } else {
          console.error("Sign up error:", error.message);
          toast({
            title: "Sign up failed",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      // Send confirmation email (fire and forget)
      supabase.functions.invoke("send-signup-confirmation", {
        body: {
          email: formData.email,
          name: fullName,
          type: "user",
        },
      }).catch(console.error);

      if (!session) {
        // Email confirmation is required before a session exists - don't send
        // the user into ProtectedRoute, which would just bounce them to /signin.
        setAwaitingConfirmation(true);
        return;
      }

      toast({
        title: "Account created!",
        description: "Welcome to Cook A Look.",
      });

      navigate(redirectTo, { replace: true });
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (awaitingConfirmation) {
    return (
      <Layout>
        <Seo
          title="Confirm Your Email | Cook A Look"
          description="Confirm your email to finish creating your Cook A Look account."
          path="/signup"
          noindex
        />
        <section className="py-24 bg-background min-h-[80vh] flex items-center">
          <div className="container mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-md mx-auto text-center"
            >
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                Check Your Email
              </h1>
              <p className="font-sans text-muted-foreground">
                We've sent a confirmation link to <span className="text-foreground font-medium">{formData.email}</span>.
                Click it to activate your account, then sign in below.
              </p>
              <Button variant="hero" size="lg" className="w-full mt-8" asChild>
                <Link to="/signin">Go to Sign In</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title="Create Account | Cook A Look"
        description="Create your Cook A Look client account to book personal styling consultations with professional advisors."
        path="/signup"
        noindex
      />
      <section className="py-24 bg-background min-h-[80vh] flex items-center">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-10">
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4">
                Create Account
              </h1>
              <p className="font-sans text-muted-foreground">
                {isBookingFlow
                  ? "One quick step before you book. It's free and takes about 30 seconds."
                  : "Join Cook A Look and connect with style experts"}
              </p>
              {isBookingFlow && (
                <p className="mt-4 text-sm font-sans text-foreground bg-secondary/60 border border-border px-3 py-2">
                  Your selected time is saved. You'll go straight back to checkout after this.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-sm text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-sm text-destructive">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground font-sans">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and Privacy Policy.
              </p>
            </form>

            <GoogleSignInSection label="Sign up with Google" redirectPath={redirectTo} />


            <p className="text-center mt-8 font-sans text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to={redirectParam ? `/signin?redirect=${encodeURIComponent(redirectParam)}` : "/signin"}
                className="text-foreground hover:text-gold transition-colors font-medium"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default SignUp;
