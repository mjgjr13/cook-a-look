-- Remove direct SELECT access to advisor_reviews; force all reads through RPCs
DROP POLICY IF EXISTS "Review author can read" ON public.advisor_reviews;
DROP POLICY IF EXISTS "Review author and reviewed advisor can read" ON public.advisor_reviews;

-- Helper RPC: given a set of booking_ids the caller participates in, return which already have a review
CREATE OR REPLACE FUNCTION public.get_reviewed_booking_ids(p_booking_ids uuid[])
RETURNS TABLE(booking_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.booking_id
  FROM public.advisor_reviews r
  JOIN public.bookings b ON b.id = r.booking_id
  JOIN public.profiles pc ON pc.id = b.client_id
  WHERE r.booking_id = ANY(p_booking_ids)
    AND pc.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_reviewed_booking_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reviewed_booking_ids(uuid[]) TO authenticated;