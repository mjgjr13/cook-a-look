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
      admin_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      advisor_applications: {
        Row: {
          admin_notes: string | null
          bio: string
          created_at: string
          email: string
          experience: string | null
          first_name: string
          id: string
          id_document_url: string | null
          in_person: boolean | null
          instagram: string
          last_name: string
          linkedin: string | null
          liveness_verified: boolean | null
          phone: string | null
          portfolio: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          specialty: string
          status: string
          tiktok: string | null
          updated_at: string
          user_id: string
          virtual: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          bio: string
          created_at?: string
          email: string
          experience?: string | null
          first_name: string
          id?: string
          id_document_url?: string | null
          in_person?: boolean | null
          instagram: string
          last_name: string
          linkedin?: string | null
          liveness_verified?: boolean | null
          phone?: string | null
          portfolio?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          specialty: string
          status?: string
          tiktok?: string | null
          updated_at?: string
          user_id: string
          virtual?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          bio?: string
          created_at?: string
          email?: string
          experience?: string | null
          first_name?: string
          id?: string
          id_document_url?: string | null
          in_person?: boolean | null
          instagram?: string
          last_name?: string
          linkedin?: string | null
          liveness_verified?: boolean | null
          phone?: string | null
          portfolio?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          specialty?: string
          status?: string
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          virtual?: boolean | null
        }
        Relationships: []
      }
      advisor_availability_breaks: {
        Row: {
          advisor_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          label: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          label?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          label?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_availability_breaks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_availability_windows: {
        Row: {
          advisor_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_virtual: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_virtual?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_virtual?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_availability_windows_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_date_blocks: {
        Row: {
          advisor_id: string
          block_date: string
          created_at: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          advisor_id: string
          block_date: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          advisor_id?: string
          block_date?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_date_blocks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_date_overrides: {
        Row: {
          advisor_id: string
          created_at: string
          end_time: string | null
          id: string
          is_available: boolean
          override_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          override_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          override_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_date_overrides_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_monthly_stats: {
        Row: {
          advisor_id: string
          completed_bookings: number
          created_at: string
          id: string
          month_year: string
          reduced_fee_unlocked: boolean
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          completed_bookings?: number
          created_at?: string
          id?: string
          month_year: string
          reduced_fee_unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          completed_bookings?: number
          created_at?: string
          id?: string
          month_year?: string
          reduced_fee_unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      advisor_profiles: {
        Row: {
          application_status: string
          availability_set: boolean | null
          bio: string | null
          created_at: string | null
          id: string
          is_listed: boolean
          is_published: boolean
          legal_accepted_at: string | null
          onboarding_completed_at: string | null
          onboarding_status: string
          portfolio_images: string[] | null
          price: number | null
          specialties: string[] | null
          status: string
          timezone: string | null
          updated_at: string | null
          user_id: string
          verification_completed_at: string | null
          years_experience: number | null
        }
        Insert: {
          application_status?: string
          availability_set?: boolean | null
          bio?: string | null
          created_at?: string | null
          id?: string
          is_listed?: boolean
          is_published?: boolean
          legal_accepted_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          portfolio_images?: string[] | null
          price?: number | null
          specialties?: string[] | null
          status?: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          verification_completed_at?: string | null
          years_experience?: number | null
        }
        Update: {
          application_status?: string
          availability_set?: boolean | null
          bio?: string | null
          created_at?: string | null
          id?: string
          is_listed?: boolean
          is_published?: boolean
          legal_accepted_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          portfolio_images?: string[] | null
          price?: number | null
          specialties?: string[] | null
          status?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          verification_completed_at?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      advisor_reviews: {
        Row: {
          advisor_id: string
          booking_id: string
          client_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          booking_id: string
          client_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          booking_id?: string
          client_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_reviews_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_verification_archive: {
        Row: {
          application_id: string
          archived_at: string
          archived_by: string | null
          id: string
          id_document_url: string | null
          selfie_url: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          archived_at?: string
          archived_by?: string | null
          id?: string
          id_document_url?: string | null
          selfie_url?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          archived_at?: string
          archived_by?: string | null
          id?: string
          id_document_url?: string | null
          selfie_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_verification_archive_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "advisor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
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
      booking_messages: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advisor_id: string
          client_id: string
          completed_at: string | null
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
          completed_at?: string | null
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
          completed_at?: string | null
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
      disputes: {
        Row: {
          admin_notes: string | null
          booking_id: string
          created_at: string | null
          description: string | null
          id: string
          payment_id: string
          raised_by: string
          reason: string
          recording_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          booking_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_id: string
          raised_by: string
          reason: string
          recording_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_id?: string
          raised_by?: string
          reason?: string
          recording_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
      lookbook_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      lookbook_items: {
        Row: {
          aspect_ratio: string
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          advisor_id: string
          advisor_payout: number | null
          amount: number
          booking_id: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          escrow_release_at: string | null
          escrow_status: string | null
          id: string
          meeting_started_at: string | null
          platform_fee: number | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advisor_id: string
          advisor_payout?: number | null
          amount: number
          booking_id?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          escrow_release_at?: string | null
          escrow_status?: string | null
          id?: string
          meeting_started_at?: string | null
          platform_fee?: number | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string
          advisor_payout?: number | null
          amount?: number
          booking_id?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          escrow_release_at?: string | null
          escrow_status?: string | null
          id?: string
          meeting_started_at?: string | null
          platform_fee?: number | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
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
      point_transactions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          advisor_approved: boolean | null
          advisor_status: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          demo_availability_enabled: boolean | null
          email: string | null
          experience_years: number | null
          full_name: string | null
          id: string
          in_person_available: boolean | null
          instagram_url: string | null
          is_advisor: boolean | null
          is_demo: boolean
          languages: string[] | null
          location: string | null
          onboarding_acknowledged_at: string | null
          personal_philosophy: string | null
          portfolio_images: string[] | null
          portfolio_url: string | null
          price_per_session: number | null
          profile_photos: string[] | null
          rating: number | null
          referral_code: string | null
          referred_by: string | null
          review_count: number | null
          role: string
          session_duration: number | null
          specialty: string | null
          style_tags: string[] | null
          target_demographics: string[] | null
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          verified: boolean | null
          virtual_available: boolean | null
        }
        Insert: {
          account_type?: string | null
          advisor_approved?: boolean | null
          advisor_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          demo_availability_enabled?: boolean | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          in_person_available?: boolean | null
          instagram_url?: string | null
          is_advisor?: boolean | null
          is_demo?: boolean
          languages?: string[] | null
          location?: string | null
          onboarding_acknowledged_at?: string | null
          personal_philosophy?: string | null
          portfolio_images?: string[] | null
          portfolio_url?: string | null
          price_per_session?: number | null
          profile_photos?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string
          session_duration?: number | null
          specialty?: string | null
          style_tags?: string[] | null
          target_demographics?: string[] | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          virtual_available?: boolean | null
        }
        Update: {
          account_type?: string | null
          advisor_approved?: boolean | null
          advisor_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          demo_availability_enabled?: boolean | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          in_person_available?: boolean | null
          instagram_url?: string | null
          is_advisor?: boolean | null
          is_demo?: boolean
          languages?: string[] | null
          location?: string | null
          onboarding_acknowledged_at?: string | null
          personal_philosophy?: string | null
          portfolio_images?: string[] | null
          portfolio_url?: string | null
          price_per_session?: number | null
          profile_photos?: string[] | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          review_count?: number | null
          role?: string
          session_duration?: number | null
          specialty?: string | null
          style_tags?: string[] | null
          target_demographics?: string[] | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          virtual_available?: boolean | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          booking_completed_at: string | null
          created_at: string
          id: string
          points_awarded: boolean
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: boolean
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: boolean
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_credits_log: {
        Row: {
          action_type: string
          amount_cents: number
          balance_after_cents: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          created_at: string
          credit_expires_at: string | null
          current_tier: string
          id: string
          lifetime_points: number
          points_to_next_tier: number
          site_credit_cents: number
          tier_upgraded_at: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_expires_at?: string | null
          current_tier?: string
          id?: string
          lifetime_points?: number
          points_to_next_tier?: number
          site_credit_cents?: number
          tier_upgraded_at?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_expires_at?: string | null
          current_tier?: string
          id?: string
          lifetime_points?: number
          points_to_next_tier?: number
          site_credit_cents?: number
          tier_upgraded_at?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
          recording_status: string | null
          recording_url: string | null
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
          recording_status?: string | null
          recording_url?: string | null
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
          recording_status?: string | null
          recording_url?: string | null
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
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          advisor_id: string
          amount: number
          created_at: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          advisor_id: string
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          advisor_id?: string
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_client_points: {
        Args: {
          _action_type: string
          _created_by?: string
          _description?: string
          _points: number
          _reference_id?: string
          _user_id: string
        }
        Returns: undefined
      }
      can_leave_review: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      get_active_published_advisors: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          experience_years: number
          full_name: string
          id: string
          in_person_available: boolean
          location: string
          portfolio_images: string[]
          price: number
          rating: number
          review_count: number
          specialty: string
          user_id: string
          verified: boolean
          virtual_available: boolean
        }[]
      }
      get_advisor_monthly_stats: {
        Args: { advisor_profile_id: string }
        Returns: {
          bookings_until_reduced: number
          completed_bookings: number
          reduced_fee_unlocked: boolean
        }[]
      }
      get_advisor_public_profile: {
        Args: { advisor_profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          experience_years: number
          full_name: string
          id: string
          in_person_available: boolean
          instagram_url: string
          languages: string[]
          location: string
          personal_philosophy: string
          portfolio_images: string[]
          portfolio_url: string
          price_per_session: number
          rating: number
          review_count: number
          session_duration: number
          specialty: string
          style_tags: string[]
          target_demographics: string[]
          verified: boolean
          virtual_available: boolean
        }[]
      }
      get_all_advisor_profiles_including_demo: {
        Args: never
        Returns: {
          advisor_approved: boolean
          avatar_url: string
          bio: string
          experience_years: number
          full_name: string
          id: string
          in_person_available: boolean
          instagram_url: string
          is_advisor: boolean
          is_demo: boolean
          languages: string[]
          location: string
          personal_philosophy: string
          portfolio_images: string[]
          portfolio_url: string
          price_per_session: number
          rating: number
          review_count: number
          session_duration: number
          specialty: string
          style_tags: string[]
          target_demographics: string[]
          verified: boolean
          virtual_available: boolean
        }[]
      }
      get_available_booking_slots: {
        Args: {
          p_advisor_id: string
          p_buffer_minutes?: number
          p_date: string
          p_duration_minutes?: number
        }
        Returns: {
          is_virtual: boolean
          slot_end: string
          slot_start: string
        }[]
      }
      get_client_rewards_summary: {
        Args: { _user_id: string }
        Returns: {
          credit_expires_at: string
          current_tier: string
          lifetime_points: number
          next_tier: string
          next_tier_credit_cents: number
          points_to_next_tier: number
          site_credit_cents: number
          total_points: number
        }[]
      }
      get_public_advisor_profiles: {
        Args: never
        Returns: {
          advisor_approved: boolean
          avatar_url: string
          bio: string
          experience_years: number
          full_name: string
          id: string
          in_person_available: boolean
          instagram_url: string
          is_advisor: boolean
          is_demo: boolean
          languages: string[]
          location: string
          personal_philosophy: string
          portfolio_images: string[]
          portfolio_url: string
          price_per_session: number
          rating: number
          review_count: number
          session_duration: number
          specialty: string
          style_tags: string[]
          target_demographics: string[]
          verified: boolean
          virtual_available: boolean
        }[]
      }
      get_public_featured_advisors: {
        Args: never
        Returns: {
          advisor_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_booking_participant: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      is_slot_available: {
        Args: { p_advisor_id: string; p_end_time: string; p_start_time: string }
        Returns: boolean
      }
      redeem_site_credits: {
        Args: { _amount_cents: number; _description?: string; _user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "client"
        | "advisor_applicant"
        | "advisor_active"
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
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "client",
        "advisor_applicant",
        "advisor_active",
      ],
    },
  },
} as const
