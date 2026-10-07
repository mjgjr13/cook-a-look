-- Reconcile with the live database (exported 2026-10-07): these objects are
-- created by earlier migrations but were removed from the live database
-- outside migrations. Dropping them so a database built from these files
-- behaves exactly like production (no points for reviews; reward rows are
-- managed by the service role, see "Service role can manage all rewards").
DROP TRIGGER IF EXISTS award_points_on_review ON public.advisor_reviews;
DROP POLICY IF EXISTS "Admins can insert rewards" ON public.user_rewards;
DROP POLICY IF EXISTS "Admins can update rewards" ON public.user_rewards;
DROP POLICY IF EXISTS "Admins can view all rewards" ON public.user_rewards;
