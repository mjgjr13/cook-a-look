-- ============= Full file contents =============

-- Block profanity in user-written text across the site (owner request,
-- 2026-10-07). Additive: a checker function and BEFORE triggers.
--
-- Same whole-word list as src/lib/profanity.ts (keep in sync). On UPDATE
-- only columns that actually changed are checked, so existing rows never
-- block unrelated updates (ratings, statuses, payouts).

CREATE OR REPLACE FUNCTION public.contains_profanity(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_text, '') ~* '\m(f+[u*@]+c+k\w*|motherf\w*|sh[i1!]+t(s|ty|head\w*)?|b[i1!]tch(es|y)?|c+u+n+t\w*|assholes?|arseholes?|bastards?|dick(s|head\w*)?|puss(y|ies)|cock(s|sucker\w*)?|sluts?|whores?|fag(s|got\w*)?|nigg(er|a)\w*|retard(ed|s)?|twats?|wank\w*|pricks?|bollocks|dumbass\w*|jackass\w*)\M';
$$;

-- Trigger: TG_ARGV lists the text columns to check.
CREATE OR REPLACE FUNCTION public.reject_profanity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  col text;
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF (old_row IS NULL OR (new_row -> col) IS DISTINCT FROM (old_row -> col))
        AND public.contains_profanity(new_row ->> col) THEN
      RAISE EXCEPTION 'Please remove offensive language and try again.'
        USING ERRCODE = 'check_violation', HINT = 'profanity_not_allowed';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.profiles;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('full_name', 'bio', 'personal_philosophy', 'specialty', 'location', 'corporate_industries');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.advisor_applications;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.advisor_applications
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('first_name', 'last_name', 'bio', 'specialty', 'experience');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.advisor_reviews;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.advisor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('review_text');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.booking_messages;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.booking_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('message');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.disputes;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('description', 'reason');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.bookings;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('corporate_details');

DROP TRIGGER IF EXISTS reject_profanity_trg ON public.concierge_feedback;
CREATE TRIGGER reject_profanity_trg BEFORE INSERT OR UPDATE ON public.concierge_feedback
  FOR EACH ROW EXECUTE FUNCTION public.reject_profanity('comment');