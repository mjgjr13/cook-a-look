
-- 1. Remove permissive public SELECT on advisor_profiles; reads go through SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Public can view active published advisors" ON public.advisor_profiles;

-- 2. Tighten featured_advisors policies to authenticated only
DROP POLICY IF EXISTS "Advisors can view their own featured records" ON public.featured_advisors;
CREATE POLICY "Advisors can view their own featured records"
ON public.featured_advisors
FOR SELECT
TO authenticated
USING (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Advisors can update their featured status" ON public.featured_advisors;
CREATE POLICY "Advisors can update their featured status"
ON public.featured_advisors
FOR UPDATE
TO authenticated
USING (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 3. Tighten withdrawal_requests SELECT to authenticated only
DROP POLICY IF EXISTS "Advisors can view their own withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Advisors can view their own withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- 4. Set search_path on the email queue helper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;
