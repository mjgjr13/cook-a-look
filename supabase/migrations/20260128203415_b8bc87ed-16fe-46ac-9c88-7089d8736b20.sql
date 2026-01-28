-- Drop and recreate the advisor sync trigger with corrected logic
-- Approval should NOT auto-list - advisor controls their own visibility

DROP TRIGGER IF EXISTS on_advisor_profile_change ON advisor_profiles;
DROP FUNCTION IF EXISTS sync_advisor_status();

-- Recreated function: syncs approval status to profiles but does NOT touch is_listed
CREATE OR REPLACE FUNCTION sync_advisor_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When advisor_profiles status changes, update profiles table
  -- NOTE: We do NOT set is_listed here - advisor controls that themselves
  UPDATE profiles SET
    is_advisor = (NEW.application_status = 'approved'),
    advisor_approved = (NEW.application_status = 'approved'),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger on application_status OR onboarding_status changes
CREATE TRIGGER on_advisor_profile_change
  AFTER INSERT OR UPDATE OF application_status, onboarding_status ON advisor_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_advisor_status();