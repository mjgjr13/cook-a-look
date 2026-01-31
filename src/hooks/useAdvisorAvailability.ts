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

export interface AvailabilityBreak {
  id?: string;
  advisor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label?: string;
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
  const [breaks, setBreaks] = useState<AvailabilityBreak[]>([]);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!advisorId) {
      setWindows([]);
      setBreaks([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch windows, breaks, and timezone in parallel
      const [windowsRes, breaksRes, profileRes] = await Promise.all([
        supabase
          .from("advisor_availability_windows")
          .select("*")
          .eq("advisor_id", advisorId)
          .order("day_of_week"),
        supabase
          .from("advisor_availability_breaks")
          .select("*")
          .eq("advisor_id", advisorId)
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("advisor_profiles")
          .select("timezone")
          .eq("user_id", (await supabase.from("profiles").select("user_id").eq("id", advisorId).single()).data?.user_id || "")
          .single(),
      ]);

      if (windowsRes.error) throw windowsRes.error;
      setWindows(windowsRes.data || []);

      if (!breaksRes.error) {
        setBreaks(breaksRes.data || []);
      }

      if (profileRes.data?.timezone) {
        setTimezone(profileRes.data.timezone);
      }
    } catch (err) {
      console.error("Error fetching availability data:", err);
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
    fetchData();
  }, [fetchData]);

  const saveWindow = async (window: Omit<AvailabilityWindow, "id">) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      if (window.start_time >= window.end_time) {
        return { success: false, error: "End time must be after start time" };
      }

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

      await fetchData();
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

      await fetchData();
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

  const saveAll = async (
    windowsToSave: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>,
    breaksToSave: Array<{ day_of_week: number; start_time: string; end_time: string; label: string }>,
    newTimezone?: string
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

      // Validate all breaks
      for (const b of breaksToSave) {
        if (b.start_time >= b.end_time) {
          return { 
            success: false, 
            error: `Invalid break time for ${DAY_NAMES[b.day_of_week]}: End time must be after start time` 
          };
        }
      }

      // Get user_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", advisorId)
        .single();

      if (!profile?.user_id) {
        return { success: false, error: "Profile not found" };
      }

      // Delete all existing windows and breaks
      await Promise.all([
        supabase
          .from("advisor_availability_windows")
          .delete()
          .eq("advisor_id", advisorId),
        supabase
          .from("advisor_availability_breaks")
          .delete()
          .eq("advisor_id", advisorId),
      ]);

      // Insert new windows
      if (windowsToSave.length > 0) {
        const { error: windowsError } = await supabase
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

        if (windowsError) throw windowsError;
      }

      // Insert new breaks
      if (breaksToSave.length > 0) {
        const { error: breaksError } = await supabase
          .from("advisor_availability_breaks")
          .insert(
            breaksToSave.map((b) => ({
              advisor_id: advisorId,
              day_of_week: b.day_of_week,
              start_time: b.start_time,
              end_time: b.end_time,
              label: b.label,
            }))
          );

        if (breaksError) throw breaksError;
      }

      // Update availability_set flag (and timezone if provided)
      const updateData: { availability_set: boolean; timezone?: string } = { 
        availability_set: windowsToSave.length > 0,
      };
      
      if (newTimezone) {
        updateData.timezone = newTimezone;
      }

      const { error: profileError } = await supabase
        .from("advisor_profiles")
        .update(updateData)
        .eq("user_id", profile.user_id);

      if (profileError) throw profileError;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error saving availability data:", err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Failed to save" 
      };
    } finally {
      setIsSaving(false);
    }
  };

  // Simplified save for weekly defaults only (no timezone change)
  const saveWeeklyDefaults = async (
    windowsToSave: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>,
    breaksToSave: Array<{ day_of_week: number; start_time: string; end_time: string; label: string }>
  ) => {
    return saveAll(windowsToSave, breaksToSave);
  };

  // Legacy function for backward compatibility
  const saveBulkWindows = async (
    windowsToSave: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>
  ) => {
    return saveAll(windowsToSave, breaks.map(b => ({
      day_of_week: b.day_of_week,
      start_time: b.start_time,
      end_time: b.end_time,
      label: b.label || "Break",
    })), timezone);
  };

  return {
    windows,
    breaks,
    timezone,
    isLoading,
    isSaving,
    saveWindow,
    deleteWindow,
    saveAll,
    saveWeeklyDefaults,
    saveBulkWindows,
    refetch: fetchData,
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

// Get advisor's timezone
export const getAdvisorTimezone = async (advisorId: string): Promise<string> => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", advisorId)
      .single();

    if (!profile?.user_id) return "UTC";

    const { data: advisorProfile } = await supabase
      .from("advisor_profiles")
      .select("timezone")
      .eq("user_id", profile.user_id)
      .single();

    return advisorProfile?.timezone || "UTC";
  } catch {
    return "UTC";
  }
};

export default useAdvisorAvailability;
