-- Create unique partial index: only one non-cancelled booking allowed per slot_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booking_per_slot 
ON bookings (slot_id) 
WHERE status != 'cancelled';

-- Add admin SELECT policy for bookings so admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));