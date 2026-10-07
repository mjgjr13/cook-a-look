-- Restores public.advisor_profiles, which was created directly in the
-- Lovable-managed database and never written into a migration, so a fresh
-- database built from these files was missing it. Definition taken from the
-- live database (exported 2026-10-07).
--
-- Placed right after 20260113024844 (user_roles, app_role, has_role), which
-- these policies depend on. Later migrations already add, and keep working
-- with: timezone and has_been_visible_before (ADD COLUMN IF NOT EXISTS), the
-- "...advisor_profiles" admin policies, on_advisor_profile_change,
-- prevent_advisor_profile_status_escalation_trg and require_portfolio_to_list_trg.
-- This file adds only what no migration creates.

CREATE TABLE IF NOT EXISTS public.advisor_profiles (
  id                        uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL,
  status                    text NOT NULL DEFAULT 'applied',
  is_published              boolean NOT NULL DEFAULT false,
  price                     integer,
  bio                       text,
  portfolio_images          text[] DEFAULT '{}',
  specialties               text[] DEFAULT '{}',
  availability_set          boolean DEFAULT false,
  onboarding_completed_at   timestamptz,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  years_experience          integer,
  legal_accepted_at         timestamptz,
  verification_completed_at timestamptz,
  application_status        text NOT NULL DEFAULT 'pending',
  onboarding_status         text NOT NULL DEFAULT 'not_started',
  is_listed                 boolean NOT NULL DEFAULT false,
  CONSTRAINT advisor_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT advisor_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT advisor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT advisor_profiles_status_check
    CHECK (status = ANY (ARRAY['applied', 'pending', 'approved', 'active', 'rejected', 'suspended']))
);

ALTER TABLE public.advisor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own advisor profile" ON public.advisor_profiles;
CREATE POLICY "Users can view their own advisor profile" ON public.advisor_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own advisor profile" ON public.advisor_profiles;
CREATE POLICY "Users can insert their own advisor profile" ON public.advisor_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own advisor profile" ON public.advisor_profiles;
CREATE POLICY "Users can update their own advisor profile" ON public.advisor_profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all advisor profiles" ON public.advisor_profiles;
CREATE POLICY "Admins can view all advisor profiles" ON public.advisor_profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update all advisor profiles" ON public.advisor_profiles;
CREATE POLICY "Admins can update all advisor profiles" ON public.advisor_profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_advisor_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_advisor_profiles_updated_at ON public.advisor_profiles;
CREATE TRIGGER update_advisor_profiles_updated_at
  BEFORE UPDATE ON public.advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_advisor_profiles_updated_at();
