import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

interface AdvisorRouteProps {
  children: ReactNode;
}

/**
 * Route guard that only allows advisors (pending or approved) to access.
 * Non-advisors are redirected to become-advisor page.
 */
const AdvisorRoute = ({ children }: AdvisorRouteProps) => {
  const { profile, roles, isLoading } = useProfile();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/20" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!profile) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Not an advisor - redirect to become advisor page
  if (!roles.isAdvisor) {
    return <Navigate to="/become-advisor" replace />;
  }

  // User is an advisor (pending or approved) - allow access
  return <>{children}</>;
};

export default AdvisorRoute;
