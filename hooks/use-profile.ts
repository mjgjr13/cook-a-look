"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export interface UserProfile {
  id: string
  user_id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_advisor: boolean
  advisor_approved: boolean
  advisor_status: string | null
  specialty: string | null
  bio: string | null
  price_per_session: number | null
  virtual_available: boolean
  in_person_available: boolean
  onboarding_acknowledged_at: string | null
}

export interface UserRole {
  isAdmin: boolean
  isAdvisor: boolean
  isApprovedAdvisor: boolean
  isPendingAdvisor: boolean
}

interface UseProfileResult {
  profile: UserProfile | null
  roles: UserRole
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useProfile = (): UseProfileResult => {
  const { user, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [roles, setRoles] = useState<UserRole>({
    isAdmin: false,
    isAdvisor: false,
    isApprovedAdvisor: false,
    isPendingAdvisor: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setRoles({
        isAdmin: false,
        isAdvisor: false,
        isApprovedAdvisor: false,
        isPendingAdvisor: false,
      })
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      const [profileResult, adminResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ])

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error
      }

      const profileData = profileResult.data
      const isAdmin = adminResult.data === true

      if (profileData) {
        setProfile(profileData as UserProfile)
        setRoles({
          isAdmin,
          isAdvisor: profileData.is_advisor === true,
          isApprovedAdvisor: profileData.is_advisor === true && profileData.advisor_approved === true,
          isPendingAdvisor: profileData.is_advisor === true && profileData.advisor_status === "pending",
        })
      } else {
        setProfile(null)
        setRoles({
          isAdmin,
          isAdvisor: false,
          isApprovedAdvisor: false,
          isPendingAdvisor: false,
        })
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      fetchProfile()
    }
  }, [user, authLoading, fetchProfile])

  return {
    profile,
    roles,
    isLoading: authLoading || isLoading,
    error,
    refetch: fetchProfile,
  }
}

export default useProfile
