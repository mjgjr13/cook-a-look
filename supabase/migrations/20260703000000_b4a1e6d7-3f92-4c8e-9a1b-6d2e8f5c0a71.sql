-- profiles.rating/review_count can drift from actual advisor_reviews rows: the
-- trigger_update_advisor_rating trigger only recomputes these on INSERT/UPDATE to
-- advisor_reviews, so any profile that had rating/review_count set directly
-- (demo/manual data, outside that trigger path) shows stale numbers - e.g. a
-- "5.0 (27 reviews)" header with an empty reviews list underneath. Backfill every
-- profile using the same aggregation the trigger uses, so the two stay consistent.
-- The privilege-escalation guard blocks rating/review_count changes; pause it
-- for this backfill only (same pattern as 20261003000000).
ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_privilege_escalation_trg;

UPDATE public.profiles p
SET
  rating = (
    SELECT COALESCE(AVG(r.rating)::numeric(2,1), 0)
    FROM public.advisor_reviews r
    WHERE r.advisor_id = p.id
  ),
  review_count = (
    SELECT COUNT(*)
    FROM public.advisor_reviews r
    WHERE r.advisor_id = p.id
  ),
  updated_at = now()
WHERE p.is_advisor = true;

ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_privilege_escalation_trg;
