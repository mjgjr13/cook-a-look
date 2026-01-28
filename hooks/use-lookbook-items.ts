"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"

export interface LookbookItem {
  id: string
  title: string
  description: string | null
  category: string
  aspect_ratio: string
  image_url: string
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export const useLookbookItems = (includeUnpublished = false) => {
  return useQuery({
    queryKey: ['lookbook-items', includeUnpublished],
    queryFn: async () => {
      const query = supabase
        .from('lookbook_items')
        .select('*')
        .order('sort_order', { ascending: true })

      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching lookbook items:', error)
        throw error
      }
      
      return (data || []) as LookbookItem[]
    }
  })
}
