-- Schema catch-up: the live app_role enum already has these three values
-- (confirmed via src/integrations/supabase/types.ts, generated from live DB
-- introspection) but no migration in this repo ever added them - they were
-- applied out-of-band at some point. Adding them here so the migration
-- history truthfully reflects the deployed schema, and so a fresh database
-- built from these migrations alone doesn't diverge from production.
-- Used by: profiles/signup flow ('client'), the (currently unreachable)
-- submit-advisor-application edge function ('advisor_applicant'), and
-- admin advisor approval in src/pages/admin/AdminAdvisors.tsx ('advisor_active').
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_applicant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_active';
