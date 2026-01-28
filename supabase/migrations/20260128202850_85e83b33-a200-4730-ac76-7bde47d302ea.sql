-- Phase 5: Enable Real-Time Updates
-- First drop if exists, then add (PostgreSQL doesn't support IF NOT EXISTS for ALTER PUBLICATION)
DO $$
BEGIN
  -- Try to add bookings to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
  
  -- Try to add availability_slots to realtime publication  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
  
  -- Try to add advisor_profiles to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.advisor_profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
END $$;