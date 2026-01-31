import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AvailabilityWindow {
  id?: string;
  advisor_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // TIME format "HH:MM:SS"
  end_time: string;
  is_virtual: boolean;
}

export interface DynamicSlot {
  slot_start: string;
  slot_end: string;
  is_virtual: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useAdvisorAvailability = (advisorId: string | null) => {
  const { toast } = useToast();
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchWindows = useCallback(async () => {
    if (!advisorId) {
      setWindows([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("advisor_availability_windows")
        .select("*")
        .eq("advisor_id", advisorId)
        .order("day_of_week");

      if (error) throw error;
      setWindows(data || []);
    } catch (err) {
      console.error("Error fetching availability windows:", err);
      toast({
        title: "Error loading availability",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [advisorId, toast]);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const saveWindow = async (window: Omit<AvailabilityWindow, "id">) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      // Validate time range
      if (window.start_time >= window.end_time) {
        return { success: false, error: "End time must be after start time" };
      }

      // Upsert - update if exists, insert if not
      const { error } = await supabase
        .from("advisor_availability_windows")
        .upsert(
          {
            advisor_id: advisorId,
            day_of_week: window.day_of_week,
            start_time: window.start_time,
            end_time: window.end_time,
            is_virtual: window.is_virtual,
          },
          {
            onConflict: "advisor_id,day_of_week",
          }
        );

      if (error) throw error;

      await fetchWindows();
      return { success: true };
    } catch (err) {
      console.error("Error saving availability window:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to save" 
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWindow = async (dayOfWeek: number) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("advisor_availability_windows")
        .delete()
        .eq("advisor_id", advisorId)
        .eq("day_of_week", dayOfWeek);

      if (error) throw error;

      await fetchWindows();
      return { success: true };
    } catch (err) {
      console.error("Error deleting availability window:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to delete" 
      };
    } finally {
      setIsSaving(false);
    }
  };

  const saveBulkWindows = async (
    windowsToSave: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>
  ) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      // Validate all windows
      for (const w of windowsToSave) {
        if (w.start_time >= w.end_time) {
          return { 
            success: false, 
            error: `Invalid time range for ${DAY_NAMES[w.day_of_week]}: End time must be after start time` 
          };
        }
      }

      // Delete all existing windows for this advisor
      await supabase
        .from("advisor_availability_windows")
        .delete()
        .eq("advisor_id", advisorId);

      // Insert new windows
      if (windowsToSave.length > 0) {
        const { error } = await supabase
          .from("advisor_availability_windows")
          .insert(
            windowsToSave.map((w) => ({
              advisor_id: advisorId,
              day_of_week: w.day_of_week,
              start_time: w.start_time,
              end_time: w.end_time,
              is_virtual: w.is_virtual,
            }))
          );

        if (error) throw error;
      }

      // Update advisor_profiles to mark availability as set
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", advisorId)
        .single();

      if (userProfile?.user_id) {
        await supabase
          .from("advisor_profiles")
          .update({ availability_set: windowsToSave.length > 0 })
          .eq("user_id", userProfile.user_id);
      }

      await fetchWindows();
      return { success: true };
    } catch (err) {
      console.error("Error saving bulk windows:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to save" 
      };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    windows,
    isLoading,
    isSaving,
    saveWindow,
    deleteWindow,
    saveBulkWindows,
    refetch: fetchWindows,
    DAY_NAMES,
  };
};

// Function to get available slots for a specific date (for booking calendar)
export const getAvailableSlotsForDate = async (
  advisorId: string,
  date: Date
): Promise<DynamicSlot[]> => {
  try {
    const dateStr = date.toISOString().split("T")[0];
    
    const { data, error } = await supabase.rpc("get_available_booking_slots", {
      p_advisor_id: advisorId,
      p_date: dateStr,
      p_duration_minutes: 60,
      p_buffer_minutes: 15,
    });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching available slots:", err);
    return [];
  }
};

export default useAdvisorAvailability;
