
-- Restrict advisor_reviews SELECT to author (client) only; advisors must use get_advisor_reviews RPC which omits client_id
DROP POLICY IF EXISTS "Review author and reviewed advisor can read" ON public.advisor_reviews;
CREATE POLICY "Review author can read"
ON public.advisor_reviews
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Tighten admin disputes policy to authenticated only (defense in depth)
DROP POLICY IF EXISTS "Admins can manage all disputes" ON public.disputes;
CREATE POLICY "Admins can manage all disputes"
ON public.disputes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
