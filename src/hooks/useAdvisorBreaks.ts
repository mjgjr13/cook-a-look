import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AvailabilityBreak {
  id?: string;
  advisor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label?: string;
}

export const useAdvisorBreaks = (advisorId: string | null) => {
  const { toast } = useToast();
  const [breaks, setBreaks] = useState<AvailabilityBreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBreaks = useCallback(async () => {
    if (!advisorId) {
      setBreaks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("advisor_availability_breaks")
        .select("*")
        .eq("advisor_id", advisorId)
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      setBreaks(data || []);
    } catch (err) {
      console.error("Error fetching breaks:", err);
      toast({
        title: "Error loading breaks",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [advisorId, toast]);

  useEffect(() => {
    fetchBreaks();
  }, [fetchBreaks]);

  const addBreak = async (breakData: Omit<AvailabilityBreak, "id" | "advisor_id">) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      if (breakData.start_time >= breakData.end_time) {
        return { success: false, error: "End time must be after start time" };
      }

      const { error } = await supabase
        .from("advisor_availability_breaks")
        .insert({
          advisor_id: advisorId,
          day_of_week: breakData.day_of_week,
          start_time: breakData.start_time,
          end_time: breakData.end_time,
          label: breakData.label || "Break",
        });

      if (error) throw error;

      await fetchBreaks();
      return { success: true };
    } catch (err) {
      console.error("Error adding break:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to add break",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBreak = async (breakId: string) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("advisor_availability_breaks")
        .delete()
        .eq("id", breakId);

      if (error) throw error;

      await fetchBreaks();
      return { success: true };
    } catch (err) {
      console.error("Error deleting break:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete break",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const saveBulkBreaks = async (
    breaksToSave: Array<{ day_of_week: number; start_time: string; end_time: string; label?: string }>
  ) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      // Validate all breaks
      for (const b of breaksToSave) {
        if (b.start_time >= b.end_time) {
          return {
            success: false,
            error: `Invalid break time: End time must be after start time`,
          };
        }
      }

      // Delete all existing breaks for this advisor
      await supabase
        .from("advisor_availability_breaks")
        .delete()
        .eq("advisor_id", advisorId);

      // Insert new breaks
      if (breaksToSave.length > 0) {
        const { error } = await supabase
          .from("advisor_availability_breaks")
          .insert(
            breaksToSave.map((b) => ({
              advisor_id: advisorId,
              day_of_week: b.day_of_week,
              start_time: b.start_time,
              end_time: b.end_time,
              label: b.label || "Break",
            }))
          );

        if (error) throw error;
      }

      await fetchBreaks();
      return { success: true };
    } catch (err) {
      console.error("Error saving bulk breaks:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save breaks",
      };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    breaks,
    isLoading,
    isSaving,
    addBreak,
    deleteBreak,
    saveBulkBreaks,
    refetch: fetchBreaks,
  };
};

export default useAdvisorBreaks;
