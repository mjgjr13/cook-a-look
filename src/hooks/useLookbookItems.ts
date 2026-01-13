import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LookbookItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  aspect_ratio: string;
  image_url: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const useLookbookItems = (includeUnpublished = false) => {
  return useQuery({
    queryKey: ['lookbook-items', includeUnpublished],
    queryFn: async () => {
      // For admin view, we need to fetch all items
      // The RLS policy will handle access control
      const query = supabase
        .from('lookbook_items')
        .select('*')
        .order('sort_order', { ascending: true });

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching lookbook items:', error);
        throw error;
      }
      
      return (data || []) as LookbookItem[];
    }
  });
};

export const useCreateLookbookItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<LookbookItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lookbook_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook-items'] });
    }
  });
};

export const useUpdateLookbookItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LookbookItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('lookbook_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook-items'] });
    }
  });
};

export const useDeleteLookbookItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lookbook_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookbook-items'] });
    }
  });
};

export const useUploadLookbookImage = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lookbook')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('lookbook')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    }
  });
};
