-- AI Concierge improvement loop (owner request, 2026-10-06). Additive only.
--
--   concierge_logs      visitor questions, anonymised (no user id, emails and
--                       phone numbers scrubbed), written by the advisor-chat
--                       edge function with the service role; admin read only.
--   concierge_feedback  thumbs up/down on an answer (+ optional comment),
--                       written by anyone from the concierge page; admin read.
--   concierge_profiles  short "what the concierge remembers" summary for
--                       signed-in users; only the owner can read/edit/delete.
--
-- Logs and feedback are deleted after 90 days (purge function below, run
-- daily by pg_cron when available, and opportunistically by advisor-chat).
-- Privacy Policy section 9 describes this.

CREATE TABLE IF NOT EXISTS public.concierge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text CHECK (session_id IS NULL OR char_length(session_id) <= 64),
  question text NOT NULL CHECK (char_length(question) <= 2000),
  signed_in boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS concierge_logs_created_at_idx ON public.concierge_logs (created_at DESC);
ALTER TABLE public.concierge_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read concierge logs" ON public.concierge_logs;
CREATE POLICY "Admins can read concierge logs" ON public.concierge_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can delete concierge logs" ON public.concierge_logs;
CREATE POLICY "Admins can delete concierge logs" ON public.concierge_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.concierge_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text CHECK (session_id IS NULL OR char_length(session_id) <= 64),
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  question text CHECK (question IS NULL OR char_length(question) <= 2000),
  answer text CHECK (answer IS NULL OR char_length(answer) <= 6000)
);
CREATE INDEX IF NOT EXISTS concierge_feedback_created_at_idx ON public.concierge_feedback (created_at DESC);
ALTER TABLE public.concierge_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can leave concierge feedback" ON public.concierge_feedback;
CREATE POLICY "Anyone can leave concierge feedback" ON public.concierge_feedback
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can read concierge feedback" ON public.concierge_feedback;
CREATE POLICY "Admins can read concierge feedback" ON public.concierge_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can delete concierge feedback" ON public.concierge_feedback;
CREATE POLICY "Admins can delete concierge feedback" ON public.concierge_feedback
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT INSERT ON public.concierge_feedback TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.concierge_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 600),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.concierge_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own concierge memory" ON public.concierge_profiles;
CREATE POLICY "Users manage their own concierge memory" ON public.concierge_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 90-day retention for logs and feedback.
CREATE OR REPLACE FUNCTION public.purge_old_concierge_data()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM concierge_logs WHERE created_at < now() - INTERVAL '90 days';
  DELETE FROM concierge_feedback WHERE created_at < now() - INTERVAL '90 days';
$$;
REVOKE ALL ON FUNCTION public.purge_old_concierge_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_concierge_data() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-old-concierge-data';
    PERFORM cron.schedule('purge-old-concierge-data', '30 3 * * *', 'select public.purge_old_concierge_data();');
  END IF;
END $$;