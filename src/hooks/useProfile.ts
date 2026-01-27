import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_advisor: boolean;
  advisor_approved: boolean;
  advisor_status: string | null;
  specialty: string | null;
  bio: string | null;
  price_per_session: number | null;
  virtual_available: boolean;
  in_person_available: boolean;
  onboarding_acknowledged_at: string | null;
}

export interface UserRole {
  isAdmin: boolean;
  isAdvisor: boolean;
  isApprovedAdvisor: boolean;
  isPendingAdvisor: boolean;
}

interface UseProfileResult {
  profile: UserProfile | null;
  roles: UserRole;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage user profile and roles from Supabase.
 * This is the single source of truth for user state.
 */
export const useProfile = (): UseProfileResult => {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole>({
    isAdmin: false,
    isAdvisor: false,
    isApprovedAdvisor: false,
    isPendingAdvisor: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setRoles({
        isAdmin: false,
        isAdvisor: false,
        isApprovedAdvisor: false,
        isPendingAdvisor: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch profile and admin role in parallel
      const [profileResult, adminResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      const profileData = profileResult.data;
      const isAdmin = adminResult.data === true;

      if (profileData) {
        setProfile(profileData as UserProfile);
        setRoles({
          isAdmin,
          isAdvisor: profileData.is_advisor === true,
          isApprovedAdvisor: profileData.is_advisor === true && profileData.advisor_approved === true,
          isPendingAdvisor: profileData.is_advisor === true && profileData.advisor_status === "pending",
        });
      } else {
        // No profile yet - this can happen during signup
        setProfile(null);
        setRoles({
          isAdmin,
          isAdvisor: false,
          isApprovedAdvisor: false,
          isPendingAdvisor: false,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile]);

  return {
    profile,
    roles,
    isLoading: authLoading || isLoading,
    error,
    refetch: fetchProfile,
  };
};

/**
 * Calculate platform fee based on completed bookings this month.
 * 15% base fee, reduced to 10% after 10 bookings in a calendar month.
 */
export const calculatePlatformFee = async (advisorProfileId: string): Promise<{ feePercent: number; bookingsThisMonth: number }> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("advisor_id", advisorProfileId)
      .eq("status", "completed")
      .gte("created_at", startOfMonth.toISOString());

    if (error) {
      console.error("Error fetching bookings for fee calculation:", error);
      return { feePercent: 15, bookingsThisMonth: 0 };
    }

    const bookingsThisMonth = data?.length || 0;
    const feePercent = bookingsThisMonth >= 10 ? 10 : 15;

    return { feePercent, bookingsThisMonth };
  } catch (err) {
    console.error("Error calculating platform fee:", err);
    return { feePercent: 15, bookingsThisMonth: 0 };
  }
};

export default useProfile;
