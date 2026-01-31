-- Create breaks/blocks table for mid-day unavailable times
CREATE TABLE public.advisor_availability_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  label TEXT DEFAULT 'Break',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_break_time_range CHECK (start_time < end_time)
);

-- Add timezone column to advisor_profiles
ALTER TABLE public.advisor_profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Enable RLS
ALTER TABLE public.advisor_availability_breaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for breaks
CREATE POLICY "Advisors can view their own breaks" 
ON public.advisor_availability_breaks 
FOR SELECT 
USING (advisor_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Advisors can insert their own breaks" 
ON public.advisor_availability_breaks 
FOR INSERT 
WITH CHECK (advisor_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Advisors can update their own breaks" 
ON public.advisor_availability_breaks 
FOR UPDATE 
USING (advisor_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Advisors can delete their own breaks" 
ON public.advisor_availability_breaks 
FOR DELETE 
USING (advisor_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Anyone can view published advisor breaks (for booking calendar)
CREATE POLICY "Anyone can view published advisor breaks" 
ON public.advisor_availability_breaks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM advisor_profiles ap 
  JOIN profiles p ON p.user_id = ap.user_id 
  WHERE p.id = advisor_availability_breaks.advisor_id 
  AND ap.is_listed = true 
  AND ap.application_status = 'approved'
));

-- Update the slot calculation function to exclude breaks
CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_advisor_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_buffer_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ, is_virtual BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_window RECORD;
  v_current_slot TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_advisor_tz TEXT;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get advisor timezone (default to UTC)
  SELECT COALESCE(ap.timezone, 'UTC') INTO v_advisor_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  
  IF v_advisor_tz IS NULL THEN
    v_advisor_tz := 'UTC';
  END IF;
  
  -- Get availability window for this day
  SELECT 
    w.start_time,
    w.end_time,
    w.is_virtual
  INTO v_window
  FROM advisor_availability_windows w
  WHERE w.advisor_id = p_advisor_id
    AND w.day_of_week = v_day_of_week;
  
  -- No availability for this day
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Convert window times to timestamptz in advisor's timezone
  v_current_slot := (p_date || ' ' || v_window.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz;
  v_window_end := (p_date || ' ' || v_window.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz;
  
  -- Generate potential slots
  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= v_window_end LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check if slot is not in the past
    IF v_current_slot > NOW() THEN
      -- Check if slot overlaps with any existing booking
      IF NOT EXISTS (
        SELECT 1 FROM availability_slots s
        JOIN bookings b ON b.slot_id = s.id
        WHERE s.advisor_id = p_advisor_id
          AND b.status IN ('confirmed', 'pending')
          AND (
            (s.start_time < v_slot_end AND s.end_time > v_current_slot)
          )
      ) THEN
        -- Check if slot overlaps with any break/block
        IF NOT EXISTS (
          SELECT 1 FROM advisor_availability_breaks brk
          WHERE brk.advisor_id = p_advisor_id
            AND brk.day_of_week = v_day_of_week
            AND (
              -- Convert break times to timestamptz for comparison
              ((p_date || ' ' || brk.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
              AND ((p_date || ' ' || brk.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
            )
        ) THEN
          slot_start := v_current_slot;
          slot_end := v_slot_end;
          is_virtual := v_window.is_virtual;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
    
    -- Check if next slot needs to account for a booking that ends nearby
    -- Find the earliest booking end time after current slot
    SELECT s.end_time + (p_buffer_minutes || ' minutes')::INTERVAL
    INTO v_current_slot
    FROM availability_slots s
    JOIN bookings b ON b.slot_id = s.id
    WHERE s.advisor_id = p_advisor_id
      AND b.status IN ('confirmed', 'pending')
      AND s.end_time > v_current_slot
      AND s.end_time <= v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL
    ORDER BY s.end_time
    LIMIT 1;
    
    -- If no booking found, just advance to next hour
    IF v_current_slot IS NULL OR v_current_slot < (p_date || ' ' || v_window.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz THEN
      v_current_slot := (p_date || ' ' || v_window.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz;
      -- Move to next hour slot
      v_current_slot := v_current_slot + INTERVAL '1 hour';
      -- Round to nearest hour
      v_current_slot := date_trunc('hour', v_current_slot);
    END IF;
  END LOOP;
END;
$$;