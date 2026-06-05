
-- Fix 1: Broken duplicate-review check on advisor_reviews
DROP POLICY IF EXISTS "Clients can create reviews for their bookings" ON public.advisor_reviews;
CREATE POLICY "Clients can create reviews for their bookings"
ON public.advisor_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  can_leave_review(booking_id, auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.advisor_reviews r2
    WHERE r2.booking_id = advisor_reviews.booking_id
  )
);

-- Fix 2: Prevent users from self-mutating reward balances/points/credits
DROP POLICY IF EXISTS "Users can update their own rewards" ON public.user_rewards;
DROP POLICY IF EXISTS "Users can create their own rewards record" ON public.user_rewards;
-- Service role policy + SECURITY DEFINER functions (award_client_points, redeem_site_credits) remain the only writers.

-- Fix 3: Avatars storage bucket - add UPDATE and DELETE policies scoped to owner's folder
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 4: withdrawal_requests - lock down admin_notes & status so only admins can set/change them.
-- Currently advisors INSERT freely; restrict their inserts to default status='pending' and no admin_notes.
DROP POLICY IF EXISTS "Advisors can create withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Advisors can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  advisor_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
  AND status = 'pending'
  AND admin_notes IS NULL
  AND processed_at IS NULL
  AND processed_by IS NULL
);
