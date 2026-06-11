
-- ============================================================
-- Security hardening: review privacy, meeting-location privacy,
-- storage listing lockdown, definer-function execute lockdown
-- ============================================================

-- 1) Advisor reviews: stop leaking client_id publicly
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.advisor_reviews;

CREATE POLICY "Review author and reviewed advisor can read"
ON public.advisor_reviews
FOR SELECT TO authenticated
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.get_advisor_reviews(p_advisor_id uuid, p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  rating int,
  review_text text,
  created_at timestamptz,
  reviewer_first_name text,
  reviewer_avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    r.id,
    r.rating,
    r.review_text,
    r.created_at,
    COALESCE(split_part(p.full_name, ' ', 1), 'Anonymous') AS reviewer_first_name,
    p.avatar_url AS reviewer_avatar_url
  FROM advisor_reviews r
  LEFT JOIN profiles p ON p.id = r.client_id
  WHERE r.advisor_id = p_advisor_id
  ORDER BY r.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_advisor_reviews(uuid, int) TO anon, authenticated;

-- 2) Advisor meeting locations: don't leak addresses to anon
DROP POLICY IF EXISTS "Public can read active locations" ON public.advisor_meeting_locations;

CREATE POLICY "Authenticated can read active locations of listed advisors"
ON public.advisor_meeting_locations
FOR SELECT TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN advisor_profiles ap ON ap.user_id = p.user_id
    WHERE p.id = advisor_meeting_locations.advisor_id
      AND ap.application_status = 'approved'
      AND ap.is_listed = true
  )
);

-- 3) Storage: stop bucket enumeration. Public buckets still serve via
--    /object/public URLs even with no SELECT policy, so dropping these
--    only blocks listing (storage.from('x').list()), not <img src>.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Lookbook images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio images are publicly accessible" ON storage.objects;

-- 4) Lock down execute on internal SECURITY DEFINER functions.
--    Keep public read RPCs reachable; revoke everything else.
DO $$
DECLARE
  fn record;
  keep text[] := ARRAY[
    'get_public_advisor_profiles',
    'get_advisor_public_profile',
    'get_active_published_advisors',
    'get_all_advisor_profiles_including_demo',
    'get_available_booking_slots',
    'is_slot_available',
    'get_public_featured_advisors',
    'get_advisor_reviews',
    'get_advisor_monthly_stats',
    'get_client_rewards_summary',
    'has_role',
    'is_booking_participant',
    'can_leave_review',
    'book_slot',
    'redeem_site_credits'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated;',
      fn.nspname, fn.proname, fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role;',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END $$;
