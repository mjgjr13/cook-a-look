import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LookbookCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const useLookbookCategories = (includeInactive = false) => {
  return useQuery({
    queryKey: ["lookbook-categories", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("lookbook_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }

      return data as LookbookCategory[];
    },
  });
};

export const useCreateLookbookCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      // Get max display order
      const { data: existing } = await supabase
        .from("lookbook_categories")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.display_order ?? 0;

      const { data, error } = await supabase
        .from("lookbook_categories")
        .insert({ name, display_order: maxOrder + 1 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookbook-categories"] });
    },
  });
};

export const useUpdateLookbookCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LookbookCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("lookbook_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookbook-categories"] });
    },
  });
};

export const useDeleteLookbookCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lookbook_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookbook-categories"] });
    },
  });
};
