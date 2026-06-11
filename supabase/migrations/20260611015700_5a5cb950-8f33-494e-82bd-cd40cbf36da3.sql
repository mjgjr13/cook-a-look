
-- 1. profiles: block privilege escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
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
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. advisor_profiles: block self-approval via trigger
CREATE OR REPLACE FUNCTION public.prevent_advisor_profile_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.application_status IS DISTINCT FROM OLD.application_status
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_published IS DISTINCT FROM OLD.is_published
  THEN
    RAISE EXCEPTION 'Cannot modify advisor approval/status fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_advisor_profile_status_escalation_trg ON public.advisor_profiles;
CREATE TRIGGER prevent_advisor_profile_status_escalation_trg
BEFORE UPDATE ON public.advisor_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_advisor_profile_status_escalation();

-- 3. bookings: remove direct INSERT (book_slot RPC handles it), remove user UPDATE
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- 4. payments: remove client INSERT (only service role / edge function)
DROP POLICY IF EXISTS "Clients can insert their own payments" ON public.payments;

-- 5. featured_advisors: prevent advisor manipulation of financial fields
CREATE OR REPLACE FUNCTION public.prevent_featured_advisor_financial_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
  THEN
    RAISE EXCEPTION 'Cannot modify featured advisor financial fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_featured_advisor_financial_changes_trg ON public.featured_advisors;
CREATE TRIGGER prevent_featured_advisor_financial_changes_trg
BEFORE UPDATE ON public.featured_advisors
FOR EACH ROW EXECUTE FUNCTION public.prevent_featured_advisor_financial_changes();

-- Also block setting payment_status='paid' / amount_paid > 0 on INSERT
CREATE OR REPLACE FUNCTION public.prevent_featured_advisor_insert_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.payment_status := 'pending';
  NEW.amount_paid := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_featured_advisor_insert_paid_trg ON public.featured_advisors;
CREATE TRIGGER prevent_featured_advisor_insert_paid_trg
BEFORE INSERT ON public.featured_advisors
FOR EACH ROW EXECUTE FUNCTION public.prevent_featured_advisor_insert_paid();

-- 6. disputes: allow advisor party of the booking to view their disputes
DROP POLICY IF EXISTS "Advisors can view disputes about their bookings" ON public.disputes;
CREATE POLICY "Advisors can view disputes about their bookings"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.profiles p ON p.id = b.advisor_id
    WHERE b.id = disputes.booking_id AND p.user_id = auth.uid()
  )
);

-- 7. withdrawal_requests: validate payment_details shape
CREATE OR REPLACE FUNCTION public.validate_withdrawal_payment_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  method text;
BEGIN
  IF NEW.payment_details IS NULL OR jsonb_typeof(NEW.payment_details) <> 'object' THEN
    RAISE EXCEPTION 'payment_details must be a JSON object';
  END IF;
  method := NEW.payment_details->>'method';
  IF method IS NULL OR method NOT IN ('paypal','bank_transfer','venmo','zelle','wise') THEN
    RAISE EXCEPTION 'Invalid or missing payment_details.method';
  END IF;
  -- Cap payload size to prevent abuse
  IF length(NEW.payment_details::text) > 2000 THEN
    RAISE EXCEPTION 'payment_details payload too large';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_withdrawal_payment_details_trg ON public.withdrawal_requests;
CREATE TRIGGER validate_withdrawal_payment_details_trg
BEFORE INSERT OR UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_payment_details();
