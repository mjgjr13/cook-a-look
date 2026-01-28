-- Create trigger to auto-update availability_set when slots are added/removed
CREATE OR REPLACE FUNCTION update_advisor_availability_status()
RETURNS TRIGGER AS $$
DECLARE
  slot_count INTEGER;
  advisor_user_id UUID;
BEGIN
  -- Get the advisor's user_id from their profile
  SELECT user_id INTO advisor_user_id
  FROM profiles
  WHERE id = COALESCE(NEW.advisor_id, OLD.advisor_id);
  
  -- Count future available slots for this advisor
  SELECT COUNT(*) INTO slot_count
  FROM availability_slots
  WHERE advisor_id = COALESCE(NEW.advisor_id, OLD.advisor_id)
    AND start_time > now()
    AND is_booked = false;
  
  -- Update advisor_profiles availability_set flag
  UPDATE advisor_profiles 
  SET availability_set = (slot_count > 0)
  WHERE user_id = advisor_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger on slot insert, update, or delete
DROP TRIGGER IF EXISTS on_availability_slot_change ON availability_slots;
CREATE TRIGGER on_availability_slot_change
  AFTER INSERT OR UPDATE OR DELETE ON availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_advisor_availability_status();