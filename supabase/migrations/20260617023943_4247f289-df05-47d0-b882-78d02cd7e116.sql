
-- 1) Bookings: restrict participant updates to safe fields only via trigger
CREATE OR REPLACE FUNCTION public.restrict_booking_participant_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only allow participants to edit `notes`. Block changes to all other fields.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.advisor_id IS DISTINCT FROM OLD.advisor_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.slot_id IS DISTINCT FROM OLD.slot_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.meeting_type IS DISTINCT FROM OLD.meeting_type
     OR NEW.location_id IS DISTINCT FROM OLD.location_id
     OR NEW.suggested_location IS DISTINCT FROM OLD.suggested_location
     OR NEW.location_status IS DISTINCT FROM OLD.location_status
     OR NEW.location_snapshot IS DISTINCT FROM OLD.location_snapshot
     OR NEW.in_person_surcharge_cents IS DISTINCT FROM OLD.in_person_surcharge_cents
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Direct updates to booking fields are not allowed. Use the appropriate RPC (cancel_booking, advisor_respond_booking).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_booking_participant_updates ON public.bookings;
CREATE TRIGGER trg_restrict_booking_participant_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.restrict_booking_participant_updates();

-- 2) Featured advisors: remove advisor UPDATE policy; only admins can modify
DROP POLICY IF EXISTS "Advisors can update their featured status" ON public.featured_advisors;

-- 3) Disputes: restrict insert policy to authenticated users
DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;
CREATE POLICY "Authenticated users can create disputes"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (raised_by = auth.uid());

-- 4) advisor_profiles: remove from realtime publication to prevent broadcasting internal fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'advisor_profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.advisor_profiles';
  END IF;
END $$;
