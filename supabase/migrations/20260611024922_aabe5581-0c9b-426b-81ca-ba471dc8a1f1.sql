
-- 1) advisor_meeting_locations
CREATE TABLE public.advisor_meeting_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_loc_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT meeting_loc_addr_len CHECK (char_length(address) BETWEEN 1 AND 300),
  CONSTRAINT meeting_loc_city_len CHECK (city IS NULL OR char_length(city) <= 120),
  CONSTRAINT meeting_loc_notes_len CHECK (notes IS NULL OR char_length(notes) <= 500)
);

GRANT SELECT ON public.advisor_meeting_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_meeting_locations TO authenticated;
GRANT ALL ON public.advisor_meeting_locations TO service_role;

ALTER TABLE public.advisor_meeting_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active locations"
  ON public.advisor_meeting_locations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Advisor manages own locations"
  ON public.advisor_meeting_locations FOR ALL
  TO authenticated
  USING (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (advisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all locations"
  ON public.advisor_meeting_locations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_meeting_locations_advisor ON public.advisor_meeting_locations(advisor_id);

CREATE TRIGGER tr_meeting_loc_updated_at
  BEFORE UPDATE ON public.advisor_meeting_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cap to 5 active locations per advisor
CREATE OR REPLACE FUNCTION public.enforce_meeting_location_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NEW.is_active THEN
    SELECT count(*) INTO v_count FROM public.advisor_meeting_locations
      WHERE advisor_id = NEW.advisor_id AND is_active = true AND id <> NEW.id;
    IF v_count >= 5 THEN
      RAISE EXCEPTION 'Maximum of 5 active meeting locations per advisor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_meeting_loc_cap
  BEFORE INSERT OR UPDATE ON public.advisor_meeting_locations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_meeting_location_cap();

-- 2) profiles: in-person surcharge ($)
ALTER TABLE public.profiles
  ADD COLUMN in_person_surcharge integer NOT NULL DEFAULT 0
  CHECK (in_person_surcharge BETWEEN 0 AND 100);

-- 3) bookings: meeting type + location
ALTER TABLE public.bookings
  ADD COLUMN meeting_type text NOT NULL DEFAULT 'virtual'
    CHECK (meeting_type IN ('virtual','in_person')),
  ADD COLUMN location_id uuid REFERENCES public.advisor_meeting_locations(id) ON DELETE SET NULL,
  ADD COLUMN suggested_location jsonb,
  ADD COLUMN location_status text NOT NULL DEFAULT 'confirmed'
    CHECK (location_status IN ('confirmed','pending_advisor_approval','declined')),
  ADD COLUMN in_person_surcharge_cents integer NOT NULL DEFAULT 0
    CHECK (in_person_surcharge_cents BETWEEN 0 AND 10000),
  ADD COLUMN location_snapshot jsonb;

-- 4) Updated book_slot RPC supporting meeting type & location
CREATE OR REPLACE FUNCTION public.book_slot(
  p_advisor_id uuid,
  p_client_user_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_is_virtual boolean DEFAULT true,
  p_meeting_type text DEFAULT 'virtual',
  p_location_id uuid DEFAULT NULL,
  p_suggested_location jsonb DEFAULT NULL,
  p_surcharge_cents integer DEFAULT 0
)
RETURNS TABLE(booking_id uuid, slot_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_profile_id uuid;
  v_slot_id uuid;
  v_booking_id uuid;
  v_loc_status text := 'confirmed';
  v_snapshot jsonb := NULL;
BEGIN
  IF p_start_time <= now() THEN RAISE EXCEPTION 'slot_in_past'; END IF;
  IF p_meeting_type NOT IN ('virtual','in_person') THEN RAISE EXCEPTION 'invalid_meeting_type'; END IF;

  SELECT id INTO v_client_profile_id FROM profiles WHERE user_id = p_client_user_id;
  IF v_client_profile_id IS NULL THEN RAISE EXCEPTION 'client_profile_missing'; END IF;

  IF p_meeting_type = 'in_person' THEN
    IF p_location_id IS NOT NULL THEN
      SELECT jsonb_build_object('name', name, 'address', address, 'city', city)
        INTO v_snapshot
        FROM advisor_meeting_locations
        WHERE id = p_location_id AND advisor_id = p_advisor_id AND is_active = true;
      IF v_snapshot IS NULL THEN RAISE EXCEPTION 'invalid_location'; END IF;
      v_loc_status := 'confirmed';
    ELSIF p_suggested_location IS NOT NULL THEN
      v_snapshot := p_suggested_location;
      v_loc_status := 'pending_advisor_approval';
    ELSE
      RAISE EXCEPTION 'location_required';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id AND s.is_booked = true
      AND s.start_time < p_end_time + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > p_start_time
  ) THEN RAISE EXCEPTION 'slot_taken'; END IF;

  BEGIN
    INSERT INTO availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
    VALUES (p_advisor_id, p_start_time, p_end_time, p_is_virtual, true)
    RETURNING id INTO v_slot_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'slot_taken';
  END;

  INSERT INTO bookings (
    advisor_id, client_id, slot_id, status,
    meeting_type, location_id, suggested_location,
    location_status, in_person_surcharge_cents, location_snapshot
  )
  VALUES (
    p_advisor_id, v_client_profile_id, v_slot_id, 'pending',
    p_meeting_type, p_location_id,
    CASE WHEN p_meeting_type='in_person' AND p_location_id IS NULL THEN p_suggested_location ELSE NULL END,
    v_loc_status, COALESCE(p_surcharge_cents, 0), v_snapshot
  )
  RETURNING id INTO v_booking_id;

  booking_id := v_booking_id;
  slot_id := v_slot_id;
  RETURN NEXT;
END;
$$;
