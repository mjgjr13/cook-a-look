-- Create booking messages table for real-time chat
CREATE TABLE public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_booking_messages_booking_id ON public.booking_messages(booking_id);
CREATE INDEX idx_booking_messages_sender_id ON public.booking_messages(sender_id);
CREATE INDEX idx_booking_messages_created_at ON public.booking_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only booking participants can read/write messages
CREATE POLICY "Participants can view booking messages"
ON public.booking_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = booking_messages.booking_id
    AND (p_client.user_id = auth.uid() OR p_advisor.user_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.booking_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = booking_id
    AND (p_client.user_id = auth.uid() OR p_advisor.user_id = auth.uid())
  )
  AND sender_id = auth.uid()
);

CREATE POLICY "Participants can update read status"
ON public.booking_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = booking_messages.booking_id
    AND (p_client.user_id = auth.uid() OR p_advisor.user_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p_client ON p_client.id = b.client_id
    JOIN profiles p_advisor ON p_advisor.id = b.advisor_id
    WHERE b.id = booking_messages.booking_id
    AND (p_client.user_id = auth.uid() OR p_advisor.user_id = auth.uid())
  )
);

-- Admins can view all messages for dispute resolution
CREATE POLICY "Admins can view all messages"
ON public.booking_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;