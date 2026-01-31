-- Create a security definer function to check if a user is a booking participant
CREATE OR REPLACE FUNCTION public.is_booking_participant(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = _booking_id
    AND (p_client.user_id = _user_id OR p_advisor.user_id = _user_id)
  )
$$;

-- Drop and recreate the INSERT policy using the security definer function
DROP POLICY IF EXISTS "Participants can send messages" ON public.booking_messages;

CREATE POLICY "Participants can send messages" ON public.booking_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_booking_participant(booking_id, auth.uid())
);

-- Also update the SELECT policy for consistency
DROP POLICY IF EXISTS "Participants can view booking messages" ON public.booking_messages;

CREATE POLICY "Participants can view booking messages" ON public.booking_messages
FOR SELECT TO authenticated
USING (public.is_booking_participant(booking_id, auth.uid()));

-- Update the UPDATE policy for consistency  
DROP POLICY IF EXISTS "Participants can update read status" ON public.booking_messages;

CREATE POLICY "Participants can update read status" ON public.booking_messages
FOR UPDATE TO authenticated
USING (public.is_booking_participant(booking_id, auth.uid()))
WITH CHECK (public.is_booking_participant(booking_id, auth.uid()));