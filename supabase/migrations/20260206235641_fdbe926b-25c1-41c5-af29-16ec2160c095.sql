
-- =============================================
-- FIX 1: Remove dead "Deny anonymous access" permissive policies
-- These PERMISSIVE policies with `false` do nothing - they are dead code
-- =============================================

-- Remove from profiles
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Remove from advisor_applications
DROP POLICY IF EXISTS "Deny anonymous access to applications" ON public.advisor_applications;

-- =============================================
-- FIX 2: Restrict availability_slots to authenticated users
-- The RPC get_available_booking_slots (SECURITY DEFINER) handles public access
-- Direct table access should require authentication
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view future availability" ON public.availability_slots;

-- Replace with authenticated-only policy
CREATE POLICY "Authenticated users can view future availability"
ON public.availability_slots
FOR SELECT
TO authenticated
USING ((start_time > now()) AND (is_booked = false));

-- =============================================
-- FIX 3: Restrict reward_settings to authenticated users
-- SECURITY DEFINER functions handle internal access
-- Only admin dashboard queries this table directly
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view reward settings" ON public.reward_settings;

-- Replace with authenticated-only policy
CREATE POLICY "Authenticated users can view reward settings"
ON public.reward_settings
FOR SELECT
TO authenticated
USING (true);
