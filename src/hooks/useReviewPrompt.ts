import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewableBooking {
  bookingId: string;
  advisorId: string;
  clientId: string;
  advisorName: string;
}

export const useReviewPrompt = (userId: string | undefined) => {
  const [pendingReview, setPendingReview] = useState<ReviewableBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkForPendingReview = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get the user's profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        setIsLoading(false);
        return;
      }

      // Find completed bookings without reviews
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          advisor_id,
          client_id,
          advisor:profiles!bookings_advisor_id_fkey(id, full_name),
          slot:availability_slots(end_time)
        `)
        .eq("client_id", profile.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error checking for pending reviews:", error);
        setIsLoading(false);
        return;
      }

      // Filter to completed sessions (past end time) that don't have reviews
      const now = new Date();
      const completedBookings = bookings?.filter(
        (b) => new Date(b.slot.end_time) < now
      );

      if (!completedBookings || completedBookings.length === 0) {
        setIsLoading(false);
        return;
      }

      // Check which bookings already have reviews (via RPC — direct table read is locked down)
      const bookingIds = completedBookings.map((b) => b.id);
      const { data: existingReviews } = await supabase.rpc("get_reviewed_booking_ids", {
        p_booking_ids: bookingIds,
      });

      const reviewedBookingIds = new Set(
        (existingReviews as Array<{ booking_id: string }> | null)?.map((r) => r.booking_id) || []
      );

      // Find the first booking without a review
      const unreviewedBooking = completedBookings.find(
        (b) => !reviewedBookingIds.has(b.id)
      );

      if (unreviewedBooking) {
        setPendingReview({
          bookingId: unreviewedBooking.id,
          advisorId: unreviewedBooking.advisor_id,
          clientId: unreviewedBooking.client_id,
          advisorName: unreviewedBooking.advisor?.full_name || "your advisor",
        });
      }
    } catch (err) {
      console.error("Error in review prompt check:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkForPendingReview();
  }, [checkForPendingReview]);

  const dismissReview = () => {
    setPendingReview(null);
  };

  const refreshReviewCheck = () => {
    setIsLoading(true);
    checkForPendingReview();
  };

  return {
    pendingReview,
    isLoading,
    dismissReview,
    refreshReviewCheck,
  };
};
