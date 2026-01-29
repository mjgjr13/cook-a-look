-- Update the sync_advisor_status trigger to NOT set advisor_approved directly
-- advisor_approved will now be controlled by the advisor's visibility toggle

CREATE OR REPLACE FUNCTION public.sync_advisor_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When advisor_profiles status changes, update profiles table
  -- NOTE: We do NOT set advisor_approved here - that is controlled by the advisor's visibility toggle
  -- We only set is_advisor when approved (so they can access advisor features)
  UPDATE profiles SET
    is_advisor = (NEW.application_status = 'approved'),
    advisor_status = NEW.application_status,
    -- Set verified when fully onboarded
    verified = (NEW.application_status = 'approved' AND NEW.onboarding_status = 'complete'),
    verification_status = CASE 
      WHEN NEW.application_status = 'approved' THEN 'approved'
      WHEN NEW.application_status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;