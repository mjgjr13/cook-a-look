export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_slots: {
        Row: {
          advisor_id: string
          created_at: string | null
          end_time: string
          id: string
          is_booked: boolean | null
          is_virtual: boolean | null
          start_time: string
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_booked?: boolean | null
          is_virtual?: boolean | null
          start_time: string
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_booked?: boolean | null
          is_virtual?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advisor_id: string
          client_id: string
          created_at: string | null
          id: string
          notes: string | null
          slot_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          client_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          slot_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          slot_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_advisors: {
        Row: {
          advisor_id: string
          amount_paid: number | null
          created_at: string | null
          end_date: string
          id: string
          payment_status: string | null
          start_date: string
        }
        Insert: {
          advisor_id: string
          amount_paid?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          payment_status?: string | null
          start_date?: string
        }
        Update: {
          advisor_id?: string
          amount_paid?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          payment_status?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_advisors_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          advisor_id: string
          amount: number
          booking_id: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          id: string
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          amount: number
          booking_id?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          amount?: number
          booking_id?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          advisor_approved: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          full_name: string | null
          id: string
          in_person_available: boolean | null
          instagram_url: string | null
          is_advisor: boolean | null
          languages: string[] | null
          location: string | null
          personal_philosophy: string | null
          portfolio_images: string[] | null
          portfolio_url: string | null
          price_per_session: number | null
          rating: number | null
          review_count: number | null
          session_duration: number | null
          specialty: string | null
          style_tags: string[] | null
          target_demographics: string[] | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          virtual_available: boolean | null
        }
        Insert: {
          account_type?: string | null
          advisor_approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          in_person_available?: boolean | null
          instagram_url?: string | null
          is_advisor?: boolean | null
          languages?: string[] | null
          location?: string | null
          personal_philosophy?: string | null
          portfolio_images?: string[] | null
          portfolio_url?: string | null
          price_per_session?: number | null
          rating?: number | null
          review_count?: number | null
          session_duration?: number | null
          specialty?: string | null
          style_tags?: string[] | null
          target_demographics?: string[] | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          virtual_available?: boolean | null
        }
        Update: {
          account_type?: string | null
          advisor_approved?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          in_person_available?: boolean | null
          instagram_url?: string | null
          is_advisor?: boolean | null
          languages?: string[] | null
          location?: string | null
          personal_philosophy?: string | null
          portfolio_images?: string[] | null
          portfolio_url?: string | null
          price_per_session?: number | null
          rating?: number | null
          review_count?: number | null
          session_duration?: number | null
          specialty?: string | null
          style_tags?: string[] | null
          target_demographics?: string[] | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          virtual_available?: boolean | null
        }
        Relationships: []
      }
      video_sessions: {
        Row: {
          booking_id: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          room_name: string
          room_url: string
          started_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          room_name: string
          room_url: string
          started_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          room_name?: string
          room_url?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
