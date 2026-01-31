-- Table for date-specific availability overrides
-- This allows advisors to override weekly defaults for specific calendar dates
CREATE TABLE public.advisor_date_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true, -- false = fully blocked day
  start_time TIME WITHOUT TIME ZONE, -- NULL if is_available = false
  end_time TIME WITHOUT TIME ZONE, -- NULL if is_available = false
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_advisor_date UNIQUE(advisor_id, override_date),
  CONSTRAINT valid_time_range CHECK (
    (is_available = false) OR 
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Table for date-specific unavailable blocks (breaks within a specific date)
CREATE TABLE public.advisor_date_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_block_range CHECK (start_time < end_time)
);

-- Enable RLS
ALTER TABLE public.advisor_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_date_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_date_overrides
CREATE POLICY "Advisors can view their own date overrides"
  ON public.advisor_date_overrides FOR SELECT
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can insert their own date overrides"
  ON public.advisor_date_overrides FOR INSERT
  WITH CHECK (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can update their own date overrides"
  ON public.advisor_date_overrides FOR UPDATE
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can delete their own date overrides"
  ON public.advisor_date_overrides FOR DELETE
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view published advisor date overrides"
  ON public.advisor_date_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM advisor_profiles ap
      JOIN profiles p ON p.user_id = ap.user_id
      WHERE p.id = advisor_date_overrides.advisor_id
        AND ap.is_listed = true
        AND ap.application_status = 'approved'
    )
  );

-- RLS Policies for advisor_date_blocks
CREATE POLICY "Advisors can view their own date blocks"
  ON public.advisor_date_blocks FOR SELECT
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can insert their own date blocks"
  ON public.advisor_date_blocks FOR INSERT
  WITH CHECK (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can update their own date blocks"
  ON public.advisor_date_blocks FOR UPDATE
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Advisors can delete their own date blocks"
  ON public.advisor_date_blocks FOR DELETE
  USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view published advisor date blocks"
  ON public.advisor_date_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM advisor_profiles ap
      JOIN profiles p ON p.user_id = ap.user_id
      WHERE p.id = advisor_date_blocks.advisor_id
        AND ap.is_listed = true
        AND ap.application_status = 'approved'
    )
  );

-- Drop and recreate the get_available_booking_slots function with date override support
DROP FUNCTION IF EXISTS public.get_available_booking_slots(UUID, DATE, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_advisor_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_buffer_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  slot_start TIMESTAMP WITH TIME ZONE,
  slot_end TIMESTAMP WITH TIME ZONE,
  is_virtual BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_window_start TIME;
  v_window_end TIME;
  v_window_is_virtual BOOLEAN;
  v_current_slot TIMESTAMP WITH TIME ZONE;
  v_slot_end TIMESTAMP WITH TIME ZONE;
  v_advisor_tz TEXT;
  v_has_date_override BOOLEAN;
  v_date_override_available BOOLEAN;
  v_override_start TIME;
  v_override_end TIME;
  v_booking_window_end DATE;
BEGIN
  -- Limit booking window to 1 month in advance
  v_booking_window_end := CURRENT_DATE + INTERVAL '1 month';
  IF p_date > v_booking_window_end THEN
    RETURN; -- No slots available beyond 1 month
  END IF;
  
  -- Don't return slots for past dates
  IF p_date < CURRENT_DATE THEN
    RETURN;
  END IF;
  
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  
  -- Get advisor timezone (default to UTC)
  SELECT COALESCE(ap.timezone, 'UTC') INTO v_advisor_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  
  IF v_advisor_tz IS NULL THEN
    v_advisor_tz := 'UTC';
  END IF;
  
  -- Check for date-specific override first
  SELECT 
    TRUE,
    is_available,
    start_time,
    end_time
  INTO 
    v_has_date_override,
    v_date_override_available,
    v_override_start,
    v_override_end
  FROM advisor_date_overrides
  WHERE advisor_id = p_advisor_id AND override_date = p_date;
  
  -- If there's an override and it's blocked, return no slots
  IF v_has_date_override AND NOT v_date_override_available THEN
    RETURN;
  END IF;
  
  -- Determine availability window (override takes precedence)
  IF v_has_date_override AND v_date_override_available THEN
    v_window_start := v_override_start;
    v_window_end := v_override_end;
    v_window_is_virtual := TRUE; -- Default for overrides
  ELSE
    -- Use weekly default
    SELECT start_time, end_time, is_virtual
    INTO v_window_start, v_window_end, v_window_is_virtual
    FROM advisor_availability_windows
    WHERE advisor_id = p_advisor_id AND day_of_week = v_day_of_week;
    
    IF NOT FOUND THEN
      RETURN; -- No availability for this day
    END IF;
  END IF;
  
  -- Start from the window start time
  v_current_slot := (p_date || ' ' || v_window_start)::TIMESTAMP AT TIME ZONE v_advisor_tz;
  
  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= 
        (p_date || ' ' || v_window_end)::TIMESTAMP AT TIME ZONE v_advisor_tz
  LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check if slot overlaps with any existing booking
    IF NOT EXISTS (
      SELECT 1 FROM availability_slots s
      JOIN bookings b ON b.slot_id = s.id
      WHERE s.advisor_id = p_advisor_id
        AND b.status IN ('confirmed', 'pending')
        AND s.start_time < v_slot_end
        AND s.end_time > v_current_slot
    ) 
    -- Check for weekly recurring breaks
    AND NOT EXISTS (
      SELECT 1 FROM advisor_availability_breaks brk
      WHERE brk.advisor_id = p_advisor_id
        AND brk.day_of_week = v_day_of_week
        AND (
          ((p_date || ' ' || brk.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || brk.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    -- Check for date-specific blocks
    AND NOT EXISTS (
      SELECT 1 FROM advisor_date_blocks db
      WHERE db.advisor_id = p_advisor_id
        AND db.block_date = p_date
        AND (
          ((p_date || ' ' || db.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || db.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    -- For today, don't show past slots
    AND (p_date > CURRENT_DATE OR v_current_slot > NOW())
    THEN
      slot_start := v_current_slot;
      slot_end := v_slot_end;
      is_virtual := v_window_is_virtual;
      RETURN NEXT;
      
      -- Move to next hour (on-the-hour starts when possible)
      v_current_slot := v_current_slot + INTERVAL '1 hour';
    ELSE
      -- Find next available slot after buffer
      -- Check for bookings that end before we want to start
      SELECT s.end_time + (p_buffer_minutes || ' minutes')::INTERVAL
      INTO v_current_slot
      FROM availability_slots s
      JOIN bookings b ON b.slot_id = s.id
      WHERE s.advisor_id = p_advisor_id
        AND b.status IN ('confirmed', 'pending')
        AND s.end_time >= v_current_slot
        AND s.end_time < (p_date || ' ' || v_window_end)::TIMESTAMP AT TIME ZONE v_advisor_tz
      ORDER BY s.end_time
      LIMIT 1;
      
      -- If no booking found, just try next hour
      IF NOT FOUND THEN
        v_current_slot := v_current_slot + INTERVAL '1 hour';
      END IF;
    END IF;
  END LOOP;
END;
$$;