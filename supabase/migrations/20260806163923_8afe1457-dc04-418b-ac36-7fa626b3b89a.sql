CREATE OR REPLACE FUNCTION public.prevent_application_status_spoofing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  v_jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');

  IF v_jwt_role = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.admin_notes := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Cannot modify application review fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_application_status_spoofing_trg ON public.advisor_applications;
CREATE TRIGGER prevent_application_status_spoofing_trg
BEFORE INSERT OR UPDATE ON public.advisor_applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_application_status_spoofing();