import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { signInSchema, type SignInFormData } from "@/lib/validations";
import { Loader2 } from "lucide-react";

const SignIn = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, user, isLoading: authLoading } = useAuth();
  const {
    profile: userProfile,
    roles,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useProfile();
  
  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignInFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const redirectTo = redirectParam || fromState || "/dashboard";

  // Redirect if already authenticated.
  // IMPORTANT: only redirect once the profile/roles are loaded to avoid redirect loops.
  useEffect(() => {
    if (!user || authLoading) return;
    if (profileLoading) return;

    // If the user is authenticated but the profile hasn't been created/loaded yet,
    // stay on this screen (prevents /signin <-> /dashboard loops).
    if (!userProfile) return;

    const target = roles.isAdmin
      ? "/admin"
      : roles.isAdvisor
        ? "/advisor"
        : redirectTo;

    navigate(target, { replace: true });
  }, [user, authLoading, profileLoading, userProfile, roles.isAdmin, roles.isAdvisor, navigate, redirectTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error when user starts typing
    if (errors[id as keyof SignInFormData]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const result = signInSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignInFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SignInFormData;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid credentials",
            description: "The email or password you entered is incorrect.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email not verified",
            description: "Please check your email and verify your account first.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      // Navigation is handled by the useEffect above once profile/roles are loaded.
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

  if (authLoading || (user && profileLoading)) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (user && !profileLoading && !userProfile) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center px-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div>
            <p className="font-serif text-xl">Finishing account setup…</p>
            <p className="text-sm text-muted-foreground mt-1">
              {profileError || "We're loading your profile. This usually takes a moment."}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title="Sign In | Cook A Look"
        description="Sign in to your Cook A Look account to book consultations, manage bookings, and message your style advisor."
        path="/signin"
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
                Welcome Back
              </h1>
              <p className="font-sans text-muted-foreground">
                Sign in to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
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
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-sans">or</span>
              </div>
            </div>
            <GoogleSignInButton label="Sign in with Google" />


            <p className="text-center mt-8 font-sans text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-foreground hover:text-gold transition-colors font-medium"
              >
                Create Account
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default SignIn;
