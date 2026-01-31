-- Create new table for advisor availability windows (continuous time ranges)
CREATE TABLE public.advisor_availability_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_virtual BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  -- Prevent duplicate entries for same advisor/day
  CONSTRAINT unique_advisor_day UNIQUE (advisor_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.advisor_availability_windows ENABLE ROW LEVEL SECURITY;

-- Policies for advisor_availability_windows
CREATE POLICY "Advisors can view their own availability windows"
ON public.advisor_availability_windows
FOR SELECT
USING (
  advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Advisors can insert their own availability windows"
ON public.advisor_availability_windows
FOR INSERT
TO authenticated
WITH CHECK (
  advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Advisors can update their own availability windows"
ON public.advisor_availability_windows
FOR UPDATE
USING (
  advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Advisors can delete their own availability windows"
ON public.advisor_availability_windows
FOR DELETE
USING (
  advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Public read access for clients to see advisor availability
CREATE POLICY "Anyone can view published advisor availability windows"
ON public.advisor_availability_windows
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM advisor_profiles ap
    JOIN profiles p ON p.user_id = ap.user_id
    WHERE p.id = advisor_id
    AND ap.is_listed = true
    AND ap.application_status = 'approved'
  )
);

-- Create function to calculate available slots dynamically
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_window_start TIME;
  v_window_end TIME;
  v_window_virtual BOOLEAN;
  v_current_slot TIMESTAMP WITH TIME ZONE;
  v_slot_end TIMESTAMP WITH TIME ZONE;
  v_booking_end TIMESTAMP WITH TIME ZONE;
  v_next_available TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get day of week (0=Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  
  -- Get availability window for this day
  SELECT aw.start_time, aw.end_time, aw.is_virtual
  INTO v_window_start, v_window_end, v_window_virtual
  FROM advisor_availability_windows aw
  WHERE aw.advisor_id = p_advisor_id
    AND aw.day_of_week = v_day_of_week;
  
  -- No availability for this day
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Start from the beginning of the availability window
  v_current_slot := p_date + v_window_start;
  
  -- Handle past times: if date is today, start from now (rounded up to next hour)
  IF p_date = CURRENT_DATE THEN
    v_next_available := date_trunc('hour', now() AT TIME ZONE 'UTC') + INTERVAL '1 hour';
    IF v_current_slot < v_next_available THEN
      v_current_slot := v_next_available;
    END IF;
  END IF;
  
  -- Loop through potential slots
  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= p_date + v_window_end LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check if this slot conflicts with any existing bookings
    SELECT s.end_time INTO v_booking_end
    FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id
      AND s.is_booked = true
      AND s.start_time < v_slot_end
      AND s.end_time > v_current_slot
    ORDER BY s.end_time DESC
    LIMIT 1;
    
    IF FOUND THEN
      -- There's a conflict, move to buffer after booking ends
      v_current_slot := v_booking_end + (p_buffer_minutes || ' minutes')::INTERVAL;
      
      -- Try to snap to hour if possible
      IF EXTRACT(MINUTE FROM v_current_slot) != 0 THEN
        -- Round up to next hour if within buffer window
        v_next_available := date_trunc('hour', v_current_slot) + INTERVAL '1 hour';
        -- Only snap to hour if we don't lose too much time
        IF v_next_available - v_current_slot < INTERVAL '30 minutes' THEN
          v_current_slot := v_next_available;
        END IF;
      END IF;
    ELSE
      -- No conflict, return this slot
      slot_start := v_current_slot;
      slot_end := v_slot_end;
      is_virtual := v_window_virtual;
      RETURN NEXT;
      
      -- Move to next hour
      v_current_slot := date_trunc('hour', v_current_slot) + INTERVAL '1 hour';
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create function to check if a specific time slot is available
CREATE OR REPLACE FUNCTION public.is_slot_available(
  p_advisor_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_window_start TIME;
  v_window_end TIME;
  v_slot_date DATE;
  v_booking_exists BOOLEAN;
BEGIN
  v_slot_date := p_start_time::DATE;
  v_day_of_week := EXTRACT(DOW FROM v_slot_date)::INTEGER;
  
  -- Check if advisor has availability window for this day
  SELECT aw.start_time, aw.end_time
  INTO v_window_start, v_window_end
  FROM advisor_availability_windows aw
  WHERE aw.advisor_id = p_advisor_id
    AND aw.day_of_week = v_day_of_week;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if slot is within availability window
  IF p_start_time::TIME < v_window_start OR p_end_time::TIME > v_window_end THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicts with existing booked slots (including buffer)
  SELECT EXISTS (
    SELECT 1 FROM availability_slots s
    WHERE s.advisor_id = p_advisor_id
      AND s.is_booked = true
      AND s.start_time < p_end_time + INTERVAL '15 minutes'
      AND s.end_time + INTERVAL '15 minutes' > p_start_time
  ) INTO v_booking_exists;
  
  RETURN NOT v_booking_exists;
END;
$$;

-- Update trigger for updated_at
CREATE TRIGGER update_availability_windows_updated_at
BEFORE UPDATE ON public.advisor_availability_windows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_available_booking_slots TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_booking_slots TO anon;
GRANT EXECUTE ON FUNCTION public.is_slot_available TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_slot_available TO anon;