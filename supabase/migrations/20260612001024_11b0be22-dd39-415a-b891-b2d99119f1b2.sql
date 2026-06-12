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
  IF current_user = 'service_role' THEN
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