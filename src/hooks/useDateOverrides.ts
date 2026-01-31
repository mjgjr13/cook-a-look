import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DateOverride {
  id: string;
  advisor_id: string;
  override_date: string; // YYYY-MM-DD
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface DateBlock {
  id: string;
  advisor_id: string;
  block_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
}

export const useDateOverrides = (advisorId: string | null) => {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [blocks, setBlocks] = useState<DateBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!advisorId) {
      setOverrides([]);
      setBlocks([]);
      setIsLoading(false);
      return;
    }

    try {
      const [overridesRes, blocksRes] = await Promise.all([
        supabase
          .from("advisor_date_overrides")
          .select("*")
          .eq("advisor_id", advisorId)
          .order("override_date"),
        supabase
          .from("advisor_date_blocks")
          .select("*")
          .eq("advisor_id", advisorId)
          .order("block_date")
          .order("start_time"),
      ]);

      if (overridesRes.error) throw overridesRes.error;
      setOverrides(overridesRes.data || []);

      if (!blocksRes.error) {
        setBlocks(blocksRes.data || []);
      }
    } catch (err) {
      console.error("Error fetching date overrides:", err);
      toast({
        title: "Error loading date settings",
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

  const saveOverride = async (override: Omit<DateOverride, "id">) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      // Upsert the override
      const { error } = await supabase
        .from("advisor_date_overrides")
        .upsert(
          {
            advisor_id: advisorId,
            override_date: override.override_date,
            is_available: override.is_available,
            start_time: override.start_time,
            end_time: override.end_time,
          },
          {
            onConflict: "advisor_id,override_date",
          }
        );

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error saving override:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOverride = async (date: string) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      // Delete override and any blocks for that date
      await Promise.all([
        supabase
          .from("advisor_date_overrides")
          .delete()
          .eq("advisor_id", advisorId)
          .eq("override_date", date),
        supabase
          .from("advisor_date_blocks")
          .delete()
          .eq("advisor_id", advisorId)
          .eq("block_date", date),
      ]);

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting override:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const addBlock = async (block: Omit<DateBlock, "id">) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      if (block.start_time >= block.end_time) {
        return { success: false, error: "End time must be after start time" };
      }

      const { error } = await supabase.from("advisor_date_blocks").insert({
        advisor_id: advisorId,
        block_date: block.block_date,
        start_time: block.start_time,
        end_time: block.end_time,
      });

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error adding block:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to add block",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBlock = async (blockId: string) => {
    if (!advisorId) return { success: false, error: "No advisor ID" };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("advisor_date_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting block:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete block",
      };
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get override for a specific date
  const getOverrideForDate = (date: string) => {
    return overrides.find((o) => o.override_date === date);
  };

  // Helper to get blocks for a specific date
  const getBlocksForDate = (date: string) => {
    return blocks.filter((b) => b.block_date === date);
  };

  return {
    overrides,
    blocks,
    isLoading,
    isSaving,
    saveOverride,
    deleteOverride,
    addBlock,
    deleteBlock,
    getOverrideForDate,
    getBlocksForDate,
    refetch: fetchData,
  };
};

export default useDateOverrides;
