
-- Explicit deny INSERT on payments for non-service roles
CREATE POLICY "Payments insert blocked for users"
  ON public.payments FOR INSERT TO authenticated, anon
  WITH CHECK (false);

-- Explicit deny INSERT/UPDATE/DELETE on refund_events for non-service roles
CREATE POLICY "Refund events insert blocked for users"
  ON public.refund_events FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Refund events update blocked for users"
  ON public.refund_events FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Refund events delete blocked for users"
  ON public.refund_events FOR DELETE TO authenticated, anon
  USING (false);

-- Explicit deny UPDATE on featured_advisors for non-admins (admin handled via has_role)
CREATE POLICY "Featured advisors update admins only"
  ON public.featured_advisors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tighten availability_slots SELECT: only slots from listed/approved advisors
DROP POLICY IF EXISTS "Authenticated users can view future availability" ON public.availability_slots;
CREATE POLICY "Public view of listed advisors future availability"
  ON public.availability_slots FOR SELECT TO anon, authenticated
  USING (
    start_time > now()
    AND is_booked = false
    AND EXISTS (
      SELECT 1 FROM public.advisor_profiles ap
      JOIN public.profiles p ON p.user_id = ap.user_id
      WHERE p.id = availability_slots.advisor_id
        AND ap.application_status = 'approved'
        AND ap.is_listed = true
    )
  );
