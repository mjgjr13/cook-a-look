export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string | null
          email: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          is_advisor: boolean | null
          advisor_approved: boolean | null
          advisor_status: string | null
          specialty: string | null
          price_per_session: number | null
          virtual_available: boolean | null
          in_person_available: boolean | null
          location: string | null
          rating: number | null
          review_count: number | null
          onboarding_acknowledged_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_advisor?: boolean | null
          advisor_approved?: boolean | null
          advisor_status?: string | null
          specialty?: string | null
          price_per_session?: number | null
          virtual_available?: boolean | null
          in_person_available?: boolean | null
          location?: string | null
          rating?: number | null
          review_count?: number | null
          onboarding_acknowledged_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_advisor?: boolean | null
          advisor_approved?: boolean | null
          advisor_status?: string | null
          specialty?: string | null
          price_per_session?: number | null
          virtual_available?: boolean | null
          in_person_available?: boolean | null
          location?: string | null
          rating?: number | null
          review_count?: number | null
          onboarding_acknowledged_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      featured_advisors: {
        Row: {
          id: string
          advisor_id: string
          start_date: string
          end_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          advisor_id: string
          start_date?: string
          end_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          advisor_id?: string
          start_date?: string
          end_date?: string
          created_at?: string | null
        }
      }
      lookbook_items: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string
          category: string
          aspect_ratio: string
          is_published: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url: string
          category: string
          aspect_ratio?: string
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string
          category?: string
          aspect_ratio?: string
          is_published?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      lookbook_categories: {
        Row: {
          id: string
          name: string
          display_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          advisor_id: string
          client_id: string
          slot_id: string
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          advisor_id: string
          client_id: string
          slot_id: string
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          advisor_id?: string
          client_id?: string
          slot_id?: string
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
      }
      availability_slots: {
        Row: {
          id: string
          advisor_id: string
          start_time: string
          end_time: string
          is_booked: boolean | null
          is_virtual: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          advisor_id: string
          start_time: string
          end_time: string
          is_booked?: boolean | null
          is_virtual?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          advisor_id?: string
          start_time?: string
          end_time?: string
          is_booked?: boolean | null
          is_virtual?: boolean | null
          created_at?: string | null
        }
      }
    }
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      get_public_featured_advisors: {
        Args: Record<string, never>
        Returns: { advisor_id: string }[]
      }
      get_public_advisor_profiles: {
        Args: Record<string, never>
        Returns: {
          id: string
          full_name: string | null
          specialty: string | null
          rating: number | null
          review_count: number | null
          price_per_session: number | null
          avatar_url: string | null
          virtual_available: boolean | null
          in_person_available: boolean | null
          location: string | null
        }[]
      }
    }
  }
}
