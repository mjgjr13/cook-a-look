-- Make payments table immutable after creation
CREATE POLICY "Payments cannot be updated"
ON payments FOR UPDATE
USING (false);

CREATE POLICY "Payments cannot be deleted"
ON payments FOR DELETE
USING (false);

-- Secure video_sessions table
-- Only the booking system (via edge functions with service role) should create sessions
-- Users should only be able to view their own sessions

-- Drop existing policy if any to recreate properly
DROP POLICY IF EXISTS "Users can view their video sessions" ON video_sessions;

-- Create proper SELECT policy - users can only view sessions for their bookings
CREATE POLICY "Users can view their video sessions"
ON video_sessions FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Prevent users from creating video sessions (only service role can)
CREATE POLICY "Video sessions cannot be created by users"
ON video_sessions FOR INSERT
WITH CHECK (false);

-- Prevent users from updating video sessions
CREATE POLICY "Video sessions cannot be updated by users"
ON video_sessions FOR UPDATE
USING (false);

-- Prevent users from deleting video sessions
CREATE POLICY "Video sessions cannot be deleted by users"
ON video_sessions FOR DELETE
USING (false);

-- Secure featured_advisors - prevent deletion by users
CREATE POLICY "Featured advisors cannot be deleted by users"
ON featured_advisors FOR DELETE
USING (false);