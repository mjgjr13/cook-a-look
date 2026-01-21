-- Remove unused SECURITY DEFINER view to eliminate the linter error.
-- The app uses get_public_featured_advisors() (a constrained RPC) instead.
DROP VIEW IF EXISTS public.public_featured_advisors;