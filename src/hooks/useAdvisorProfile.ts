import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdvisorProfile {
  id: string;
  user_id: string;
  application_status: string;
  onboarding_status: string;
  is_listed: boolean;
  is_published: boolean;
  has_been_visible_before: boolean;
  price: number | null;
  bio: string | null;
  portfolio_images: string[] | null;
  specialties: string[] | null;
  years_experience: number | null;
  availability_set: boolean | null;
  onboarding_completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileCompletionStatus {
  hasAvatar: boolean;
  hasPrice: boolean;
  hasBio: boolean;
  hasAvailability: boolean;
  isComplete: boolean;
  completedSteps: number;
  totalSteps: number;
}

interface UseAdvisorProfileResult {
  advisorProfile: AdvisorProfile | null;
  userProfile: {
    avatar_url: string | null;
    full_name: string | null;
    price_per_session: number | null;
    bio: string | null;
  } | null;
  completionStatus: ProfileCompletionStatus;
  pendingBookingsCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggleVisibility: (newValue: boolean) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook to manage advisor profile, completion status, and visibility toggle
 */
export const useAdvisorProfile = (): UseAdvisorProfileResult => {
  const { user, isLoading: authLoading } = useAuth();
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null;
    full_name: string | null;
    price_per_session: number | null;
    bio: string | null;
  } | null>(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [availabilityWindowCount, setAvailabilityWindowCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setAdvisorProfile(null);
      setUserProfile(null);
      setPendingBookingsCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch advisor_profile, user profile, and pending bookings in parallel
      const [advisorResult, profileResult] = await Promise.all([
        supabase
          .from("advisor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, avatar_url, full_name, price_per_session, bio")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (advisorResult.error && advisorResult.error.code !== "PGRST116") {
        throw advisorResult.error;
      }

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      setAdvisorProfile(advisorResult.data as AdvisorProfile | null);
      setUserProfile(profileResult.data);

      // Fetch pending bookings count if we have a profile
      if (profileResult.data?.id) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, slot:availability_slots(start_time)")
          .eq("advisor_id", profileResult.data.id)
          .in("status", ["confirmed", "pending"]);

        if (!bookingsError && bookingsData) {
          // Count future bookings only
          const futureBookings = bookingsData.filter(
            (b) => b.slot && new Date(b.slot.start_time) > new Date()
          );
          setPendingBookingsCount(futureBookings.length);
        }
      }
    } catch (err) {
      console.error("Error fetching advisor profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load advisor profile");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading, fetchData]);

  // Calculate completion status
  // hasAvatar is critical for advisor visibility
  const completionStatus: ProfileCompletionStatus = {
    hasAvatar: Boolean(userProfile?.avatar_url && userProfile.avatar_url.trim() !== ""),
    hasPrice: Boolean(userProfile?.price_per_session && userProfile.price_per_session > 0),
    hasBio: Boolean(userProfile?.bio && userProfile.bio.trim().length > 0),
    hasAvailability: Boolean(advisorProfile?.availability_set),
    isComplete: false,
    completedSteps: 0,
    totalSteps: 4,
  };

  completionStatus.completedSteps = [
    completionStatus.hasAvatar,
    completionStatus.hasPrice,
    completionStatus.hasBio,
    completionStatus.hasAvailability,
  ].filter(Boolean).length;

  completionStatus.isComplete = completionStatus.completedSteps === completionStatus.totalSteps;

  // Toggle visibility function
  const toggleVisibility = async (newValue: boolean): Promise<{ success: boolean; error?: string }> => {
    if (!advisorProfile) {
      return { success: false, error: "No advisor profile found" };
    }

    // Block hiding if there are pending bookings
    if (!newValue && pendingBookingsCount > 0) {
      return {
        success: false,
        error: `You have ${pendingBookingsCount} upcoming booking(s). Please complete or cancel them before hiding your profile.`,
      };
    }

    // Block showing if no profile photo
    if (newValue && !completionStatus.hasAvatar) {
      return {
        success: false,
        error: "A profile photo is required to list your profile publicly.",
      };
    }

    // Block showing if profile is not complete
    if (newValue && !completionStatus.isComplete) {
      return {
        success: false,
        error: "Please complete your profile setup before listing.",
      };
    }

    try {
      // Build update payload - set has_been_visible_before on first publish
      const updatePayload: { is_listed: boolean; has_been_visible_before?: boolean } = {
        is_listed: newValue,
      };
      
      // If going visible for the first time, mark as having been visible
      if (newValue && !advisorProfile.has_been_visible_before) {
        updatePayload.has_been_visible_before = true;
      }

      const { error: updateError } = await supabase
        .from("advisor_profiles")
        .update(updatePayload)
        .eq("id", advisorProfile.id);

      if (updateError) throw updateError;

      // Update local state
      setAdvisorProfile((prev) =>
        prev ? { 
          ...prev, 
          is_listed: newValue,
          has_been_visible_before: prev.has_been_visible_before || newValue,
        } : null
      );

      return { success: true };
    } catch (err) {
      console.error("Error toggling visibility:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update visibility",
      };
    }
  };

  return {
    advisorProfile,
    userProfile,
    completionStatus,
    pendingBookingsCount,
    isLoading: authLoading || isLoading,
    error,
    refetch: fetchData,
    toggleVisibility,
  };
};

export default useAdvisorProfile;
