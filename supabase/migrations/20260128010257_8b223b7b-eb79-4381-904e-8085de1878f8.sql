-- First migration: Add enum values and columns only
-- Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_applicant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_active';

-- Add verification_status column to profiles for camera verification
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_photos text[] DEFAULT '{}';

-- Add required fields to advisor_profiles for multi-step signup
ALTER TABLE public.advisor_profiles
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_completed_at timestamptz;