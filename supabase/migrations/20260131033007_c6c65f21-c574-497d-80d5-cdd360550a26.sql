-- Allow clients to view slots associated with their own bookings
-- This fixes the issue where clients can't see their booking details because the slot is marked as booked

-- Add policy for clients to view slots for their bookings
CREATE POLICY "Clients can view slots for their bookings"
ON public.availability_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.profiles p ON p.id = b.client_id
    WHERE b.slot_id = availability_slots.id
    AND p.user_id = auth.uid()
  )
);

-- Add policy for advisors to view all their own slots (including booked ones)
-- This ensures advisors can always see their slot details
CREATE POLICY "Advisors can view all their own slots"
ON public.availability_slots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = availability_slots.advisor_id
    AND p.user_id = auth.uid()
  )
);

-- Add policy for admins to view all slots
CREATE POLICY "Admins can view all slots"
ON public.availability_slots
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);