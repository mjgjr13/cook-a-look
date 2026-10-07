-- Columns that exist in the live database but were added outside migrations,
-- so a fresh database built from these files lacked them (January migrations
-- already reference profiles.verification_status). Definitions exported from
-- the live database (2026-10-07). No CHECK constraints reference them.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photos text[] DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
