import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { GOOGLE_SIGN_IN_ENABLED } from "@/lib/featureFlags";
import { getSafeRedirect } from "@/lib/safeRedirect";

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

interface Props {
  label?: string;
  /** Relative path to return to after Google sign-in (e.g. an advisor profile mid-booking). */
  redirectPath?: string | null;
}

const GoogleSignInButton = ({ label = "Continue with Google", redirectPath }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const path = getSafeRedirect(redirectPath) ?? "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${path}` },
    });
    // On success the browser navigates to Google, so we only handle errors here.
    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message || "Please try again, or use your email and password.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GoogleIcon />}
      {label}
    </Button>
  );
};

/** "or" divider + Google button. Renders nothing while Google sign-in is disabled. */
export const GoogleSignInSection = (props: Props) => {
  if (!GOOGLE_SIGN_IN_ENABLED) return null;
  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-sans">or</span>
        </div>
      </div>
      <GoogleSignInButton {...props} />
    </>
  );
};

export default GoogleSignInButton;
