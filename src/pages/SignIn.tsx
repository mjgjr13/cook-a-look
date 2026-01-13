import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { signInSchema, type SignInFormData } from "@/lib/validations";
import { Loader2 } from "lucide-react";

const SignIn = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<SignInFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignInFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectTo);
    }
  }, [user, authLoading, navigate, redirectTo]);

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

      navigate(redirectTo);
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

  return (
    <Layout>
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
