-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view future availability" ON availability_slots;

-- Create new policy allowing all users (including anonymous) to view future, unbooked slots
CREATE POLICY "Anyone can view future availability"
  ON availability_slots
  FOR SELECT
  USING ((start_time > now()) AND (is_booked = false));