-- Enable realtime for admin_messages.
-- Both AdminInbox (admin side) and AdminMessagesInbox (advisor side) subscribe
-- to postgres_changes on this table, but it was never added to the
-- supabase_realtime publication, so those subscriptions silently never fire
-- and new messages only appear after a full page refresh.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
END $$;
