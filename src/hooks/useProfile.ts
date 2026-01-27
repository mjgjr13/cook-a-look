import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
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

export interface AdvisorProfile {
  id: string;
  user_id: string;
  status: string;
  is_published: boolean;
  price: number | null;
  bio: string | null;
  portfolio_images: string[];
  specialties: string[];
  availability_set: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  isAdmin: boolean;
  isAdvisor: boolean;
  isApprovedAdvisor: boolean;
  isPendingAdvisor: boolean;
  isActiveAdvisor: boolean;
  isSubmittedAdvisor: boolean;
  role: "client" | "advisor" | "admin";
}

interface UseProfileResult {
  profile: UserProfile | null;
  advisorProfile: AdvisorProfile | null;
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
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [roles, setRoles] = useState<UserRole>({
    isAdmin: false,
    isAdvisor: false,
    isApprovedAdvisor: false,
    isPendingAdvisor: false,
    isActiveAdvisor: false,
    isSubmittedAdvisor: false,
    role: "client",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setAdvisorProfile(null);
      setRoles({
        isAdmin: false,
        isAdvisor: false,
        isApprovedAdvisor: false,
        isPendingAdvisor: false,
        isActiveAdvisor: false,
        isSubmittedAdvisor: false,
        role: "client",
      });
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch profile, advisor_profiles, and admin role in parallel
      const [profileResult, advisorProfileResult, adminResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("advisor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      const profileData = profileResult.data;
      const advisorData = advisorProfileResult.data;
      const isAdmin = adminResult.data === true;

      setProfile(profileData as UserProfile | null);
      setAdvisorProfile(advisorData as AdvisorProfile | null);

      // Determine roles based on advisor_profiles (authoritative)
      let userRole: "client" | "advisor" | "admin" = "client";
      let isAdvisor = false;
      let isPendingAdvisor = false;
      let isSubmittedAdvisor = false;
      let isApprovedAdvisor = false;
      let isActiveAdvisor = false;

      if (isAdmin) {
        userRole = "admin";
      }

      // Check advisor_profiles first (single source of truth for advisor state)
      if (advisorData) {
        isAdvisor = true;
        userRole = isAdmin ? "admin" : "advisor";
        
        // Status mapping:
        // - draft: still filling out onboarding
        // - submitted/applied/pending: under admin review
        // - approved: approved but not yet published
        // - active: fully active and published
        // - rejected: application rejected
        const status = advisorData.status;
        isPendingAdvisor = ["draft"].includes(status);
        isSubmittedAdvisor = ["submitted", "applied", "pending"].includes(status);
        isApprovedAdvisor = status === "approved";
        isActiveAdvisor = status === "active" && advisorData.is_published;
      } else if (profileData?.is_advisor || profileData?.role === "advisor") {
        // Fallback to profile.is_advisor or profile.role
        isAdvisor = true;
        userRole = isAdmin ? "admin" : "advisor";
        isSubmittedAdvisor = profileData.advisor_status === "pending" || !profileData.advisor_approved;
        isApprovedAdvisor = profileData.advisor_approved === true && profileData.advisor_status === "approved";
      }

      setRoles({
        isAdmin,
        isAdvisor,
        isApprovedAdvisor,
        isPendingAdvisor,
        isActiveAdvisor,
        isSubmittedAdvisor,
        role: userRole,
      });
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
    advisorProfile,
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
      .select("id, completed_at")
      .eq("advisor_id", advisorProfileId)
      .eq("status", "completed")
      .gte("completed_at", startOfMonth.toISOString());

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
