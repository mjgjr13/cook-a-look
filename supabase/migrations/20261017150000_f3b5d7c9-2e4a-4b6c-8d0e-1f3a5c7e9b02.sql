-- 1) Let the server (edge functions using the service role) set advisor flags.
--    prevent_profile_privilege_escalation tried to allow this with
--    `current_user = 'service_role'`, but inside a SECURITY DEFINER trigger
--    current_user is the function owner, never service_role, so server-side
--    updates of is_advisor/advisor_status were always refused. That broke the
--    advisor-application function ("Couldn't set up your advisor profile").
--    auth.role() reads the caller's JWT role and is the reliable check.
--    Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Service role (edge functions) bypass
  IF auth.role() = 'service_role' OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow the OWNER of the profile to opt into an advisor APPLICATION
  -- (move from non-advisor baseline to a pending application).
  -- Strictly: cannot grant approval, cannot flip verified, cannot escalate beyond 'pending'.
  IF NEW.user_id IS NOT NULL
     AND NEW.user_id = auth.uid()
     AND COALESCE(NEW.advisor_approved, false) = false
     AND COALESCE(OLD.advisor_approved, false) = false
     AND COALESCE(NEW.verified, false) = false
     AND COALESCE(OLD.verified, false) = false
     AND COALESCE(NEW.advisor_status, 'pending') IN ('pending')
     AND COALESCE(NEW.verification_status, 'pending') IN ('pending')
     AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.is_demo IS NOT DISTINCT FROM OLD.is_demo
     AND NEW.rating IS NOT DISTINCT FROM OLD.rating
     AND NEW.review_count IS NOT DISTINCT FROM OLD.review_count
  THEN
    RETURN NEW;
  END IF;

  -- Otherwise, block changes to privileged fields
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_advisor IS DISTINCT FROM OLD.is_advisor
     OR NEW.advisor_approved IS DISTINCT FROM OLD.advisor_approved
     OR NEW.advisor_status IS DISTINCT FROM OLD.advisor_status
     OR NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.is_demo IS DISTINCT FROM OLD.is_demo
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.review_count IS DISTINCT FROM OLD.review_count
  THEN
    RAISE EXCEPTION 'Cannot modify privileged profile fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) The "new account confirmed" admin email now says when the person signed
--    up through Become an Advisor (the application email is sent separately).
CREATE OR REPLACE FUNCTION public.notify_admin_account_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://qdpqfsqjtbvlulekfhoy.supabase.co/functions/v1/notify-admin-signup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'full_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
        'intent', NEW.raw_user_meta_data ->> 'signup_intent',
        'created_at', NEW.created_at
      ),
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admin_account_confirmed failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
