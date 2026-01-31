-- Drop and recreate the INSERT policy with explicit authenticated role
DROP POLICY IF EXISTS "Participants can send messages" ON public.booking_messages;

-- Create INSERT policy specifically for authenticated users
CREATE POLICY "Participants can send messages" ON public.booking_messages
FOR INSERT TO authenticated
WITH CHECK (
  -- Sender must be the authenticated user
  sender_id = auth.uid()
  AND
  -- User must be a participant in this booking
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = booking_id
    AND (p_client.user_id = auth.uid() OR p_advisor.user_id = auth.uid())
  )
);