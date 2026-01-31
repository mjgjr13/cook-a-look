-- Create admin_messages table for two-way admin-advisor communication
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with messages
CREATE POLICY "Admins can manage all messages" ON public.admin_messages
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view messages sent to them
CREATE POLICY "Users can view messages sent to them" ON public.admin_messages
    FOR SELECT USING (recipient_id = auth.uid());

-- Users can insert replies (messages to admins)
CREATE POLICY "Users can send messages to admins" ON public.admin_messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Users can mark their received messages as read
CREATE POLICY "Users can mark messages as read" ON public.admin_messages
    FOR UPDATE USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient ON public.admin_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON public.admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON public.admin_messages(created_at DESC);