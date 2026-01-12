import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const SignIn = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Sign In",
      description: "Authentication will be available once the backend is connected.",
    });
  };

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button variant="hero" size="lg" type="submit" className="w-full">
                Sign In
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
