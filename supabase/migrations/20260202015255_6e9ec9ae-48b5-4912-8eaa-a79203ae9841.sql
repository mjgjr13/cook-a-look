-- Fix admin_messages RLS policy to prevent admin impersonation
-- Users should only be able to send messages to admins (not to other users pretending to be from admins)

-- Drop the existing overly permissive insert policy
DROP POLICY IF EXISTS "Users can send messages to admins" ON admin_messages;

-- Create a more secure insert policy that ensures:
-- 1. Sender must be the authenticated user (already enforced)
-- 2. Either the sender is an admin (can message anyone)
-- 3. OR the recipient must be an admin (regular users can only message admins)
CREATE POLICY "Users can send messages to admins only"
ON admin_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND (
    -- Sender is an admin (can message anyone)
    has_role(auth.uid(), 'admin') OR
    -- Recipient must be an admin (users can only message admins)
    has_role(recipient_id, 'admin')
  )
);

-- Also add a policy to allow users to view messages they SENT (not just received)
CREATE POLICY "Users can view messages they sent"
ON admin_messages FOR SELECT
TO authenticated
USING (sender_id = auth.uid());