-- SECURITY FIX (audit SEC-01, SEC-02, SEC-09), 2026-10-04.
-- Earlier migrations revoked EXECUTE from PUBLIC only, but Supabase grants the
-- anon and authenticated roles execute rights directly, so these functions
-- stayed callable by anyone with the public key:
--   * email queue (enqueue/read/delete/move_to_dlq): anyone could read queued
--     emails (which can contain auth links) and send email via the platform
--   * redeem_site_credits: anyone could deduct any user's site credits
--   * get_all_advisor_profiles_including_demo: exposed unapproved applicants
-- None are called from the browser. process-email-queue uses the service role,
-- which keeps access. Permissions only - no data or schema changes.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_site_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_advisor_profiles_including_demo() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_site_credits(uuid, integer, text) TO service_role;

-- Remove the empty queue created by the audit's permission probe (it never
-- held real data; the single test message was already deleted).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'cal_audit_nonexistent_queue') THEN
    PERFORM pgmq.drop_queue('cal_audit_nonexistent_queue');
  END IF;
END $$;
