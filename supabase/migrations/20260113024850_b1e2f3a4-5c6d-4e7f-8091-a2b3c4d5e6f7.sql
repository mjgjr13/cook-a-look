-- The app_role values 'client', 'advisor_applicant' and 'advisor_active' were
-- added to the live database outside migrations and only recorded later in
-- 20260703010000, but migrations from January already use them, so a fresh
-- database failed. Adding them here, right after app_role is created
-- (20260113024844); 20260703010000 is now a no-op (ADD VALUE IF NOT EXISTS).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_applicant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor_active';
