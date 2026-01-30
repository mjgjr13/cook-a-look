-- Function to get or create current month stats for advisor
CREATE OR REPLACE FUNCTION public.get_advisor_monthly_stats(advisor_profile_id UUID)
RETURNS TABLE(
  completed_bookings INTEGER,
  reduced_fee_unlocked BOOLEAN,
  bookings_until_reduced INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  threshold INTEGER;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  SELECT setting_value INTO threshold 
  FROM reward_settings 
  WHERE setting_key = 'advisor_fee_reduction_threshold';
  
  -- Get or create stats for current month
  INSERT INTO advisor_monthly_stats (advisor_id, month_year)
  VALUES (advisor_profile_id, current_month)
  ON CONFLICT (advisor_id, month_year) DO NOTHING;
  
  RETURN QUERY
  SELECT 
    ams.completed_bookings,
    ams.reduced_fee_unlocked,
    GREATEST(0, threshold - ams.completed_bookings)::INTEGER as bookings_until_reduced
  FROM advisor_monthly_stats ams
  WHERE ams.advisor_id = advisor_profile_id
    AND ams.month_year = current_month;
END;
$$;

-- Function to update advisor monthly stats when booking is completed
CREATE OR REPLACE FUNCTION public.update_advisor_booking_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  threshold INTEGER;
  current_count INTEGER;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    current_month := to_char(now(), 'YYYY-MM');
    
    SELECT setting_value INTO threshold 
    FROM reward_settings 
    WHERE setting_key = 'advisor_fee_reduction_threshold';
    
    -- Upsert monthly stats
    INSERT INTO advisor_monthly_stats (advisor_id, month_year, completed_bookings)
    VALUES (NEW.advisor_id, current_month, 1)
    ON CONFLICT (advisor_id, month_year) 
    DO UPDATE SET 
      completed_bookings = advisor_monthly_stats.completed_bookings + 1,
      updated_at = now();
    
    -- Check if threshold reached
    SELECT completed_bookings INTO current_count
    FROM advisor_monthly_stats
    WHERE advisor_id = NEW.advisor_id AND month_year = current_month;
    
    IF current_count >= threshold THEN
      UPDATE advisor_monthly_stats
      SET reduced_fee_unlocked = true,
          unlocked_at = COALESCE(unlocked_at, now())
      WHERE advisor_id = NEW.advisor_id AND month_year = current_month;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for advisor booking stats
DROP TRIGGER IF EXISTS update_advisor_stats_on_booking ON public.bookings;
CREATE TRIGGER update_advisor_stats_on_booking
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_advisor_booking_stats();

-- Function to award points to client
CREATE OR REPLACE FUNCTION public.award_client_points(
  _user_id UUID,
  _action_type TEXT,
  _points INTEGER,
  _description TEXT DEFAULT NULL,
  _reference_id UUID DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
  new_lifetime INTEGER;
  insider_threshold INTEGER;
  vip_threshold INTEGER;
  current_tier TEXT;
  new_tier TEXT;
  insider_credit INTEGER;
  vip_credit INTEGER;
  insider_expiry INTEGER;
  vip_expiry INTEGER;
BEGIN
  -- Get thresholds from settings
  SELECT setting_value INTO insider_threshold FROM reward_settings WHERE setting_key = 'insider_threshold';
  SELECT setting_value INTO vip_threshold FROM reward_settings WHERE setting_key = 'vip_threshold';
  SELECT setting_value INTO insider_credit FROM reward_settings WHERE setting_key = 'insider_credit_cents';
  SELECT setting_value INTO vip_credit FROM reward_settings WHERE setting_key = 'vip_credit_cents';
  SELECT setting_value INTO insider_expiry FROM reward_settings WHERE setting_key = 'insider_credit_expiry_days';
  SELECT setting_value INTO vip_expiry FROM reward_settings WHERE setting_key = 'vip_credit_expiry_days';
  
  -- Insert point transaction for audit
  INSERT INTO point_transactions (user_id, action_type, points, description, reference_id, created_by)
  VALUES (_user_id, _action_type, _points, _description, _reference_id, _created_by);
  
  -- Update or insert user rewards
  INSERT INTO user_rewards (user_id, total_points, lifetime_points, current_tier)
  VALUES (_user_id, _points, _points, 'explorer')
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_rewards.total_points + _points,
    lifetime_points = user_rewards.lifetime_points + _points,
    updated_at = now()
  RETURNING total_points, lifetime_points, current_tier INTO new_total, new_lifetime, current_tier;
  
  -- Determine new tier
  IF new_lifetime >= vip_threshold THEN
    new_tier := 'vip';
  ELSIF new_lifetime >= insider_threshold THEN
    new_tier := 'insider';
  ELSE
    new_tier := 'explorer';
  END IF;
  
  -- Handle tier upgrade
  IF new_tier != current_tier THEN
    IF new_tier = 'insider' AND current_tier = 'explorer' THEN
      -- Award Insider credit
      UPDATE user_rewards SET
        current_tier = 'insider',
        site_credit_cents = site_credit_cents + insider_credit,
        credit_expires_at = now() + (insider_expiry || ' days')::INTERVAL,
        tier_upgraded_at = now(),
        points_to_next_tier = vip_threshold - new_lifetime
      WHERE user_id = _user_id;
      
      INSERT INTO site_credits_log (user_id, action_type, amount_cents, balance_after_cents, description)
      SELECT _user_id, 'tier_upgrade', insider_credit, site_credit_cents, 'Insider tier upgrade bonus'
      FROM user_rewards WHERE user_id = _user_id;
      
    ELSIF new_tier = 'vip' AND current_tier IN ('explorer', 'insider') THEN
      -- Award VIP credit
      UPDATE user_rewards SET
        current_tier = 'vip',
        site_credit_cents = site_credit_cents + vip_credit,
        credit_expires_at = now() + (vip_expiry || ' days')::INTERVAL,
        tier_upgraded_at = now(),
        points_to_next_tier = 0
      WHERE user_id = _user_id;
      
      INSERT INTO site_credits_log (user_id, action_type, amount_cents, balance_after_cents, description)
      SELECT _user_id, 'tier_upgrade', vip_credit, site_credit_cents, 'VIP tier upgrade bonus'
      FROM user_rewards WHERE user_id = _user_id;
    END IF;
  ELSE
    -- Update points_to_next_tier
    UPDATE user_rewards SET
      points_to_next_tier = CASE
        WHEN current_tier = 'explorer' THEN insider_threshold - new_lifetime
        WHEN current_tier = 'insider' THEN vip_threshold - new_lifetime
        ELSE 0
      END
    WHERE user_id = _user_id;
  END IF;
END;
$$;

-- Function to redeem site credits at checkout
CREATE OR REPLACE FUNCTION public.redeem_site_credits(
  _user_id UUID,
  _amount_cents INTEGER,
  _description TEXT DEFAULT 'Checkout redemption'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_credits INTEGER;
  redeemed INTEGER;
BEGIN
  -- Get available credits (not expired)
  SELECT CASE 
    WHEN credit_expires_at IS NULL OR credit_expires_at > now() 
    THEN site_credit_cents 
    ELSE 0 
  END INTO available_credits
  FROM user_rewards
  WHERE user_id = _user_id;
  
  IF available_credits IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Redeem up to available amount
  redeemed := LEAST(available_credits, _amount_cents);
  
  IF redeemed > 0 THEN
    UPDATE user_rewards SET
      site_credit_cents = site_credit_cents - redeemed,
      updated_at = now()
    WHERE user_id = _user_id;
    
    INSERT INTO site_credits_log (user_id, action_type, amount_cents, balance_after_cents, description)
    SELECT _user_id, 'redeemed', -redeemed, site_credit_cents, _description
    FROM user_rewards WHERE user_id = _user_id;
  END IF;
  
  RETURN redeemed;
END;
$$;

-- Trigger to award points when booking is completed
CREATE OR REPLACE FUNCTION public.award_points_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  points_value INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get client's user_id
    SELECT user_id INTO client_user_id FROM profiles WHERE id = NEW.client_id;
    
    -- Get points value from settings
    SELECT setting_value INTO points_value FROM reward_settings WHERE setting_key = 'points_per_booking';
    
    IF client_user_id IS NOT NULL AND points_value IS NOT NULL THEN
      PERFORM award_client_points(
        client_user_id,
        'booking_completed',
        points_value,
        'Completed booking with advisor',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_points_on_booking ON public.bookings;
CREATE TRIGGER award_points_on_booking
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION award_points_on_booking_complete();

-- Generate referral codes for existing users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to get client rewards summary
CREATE OR REPLACE FUNCTION public.get_client_rewards_summary(_user_id UUID)
RETURNS TABLE(
  total_points INTEGER,
  lifetime_points INTEGER,
  current_tier TEXT,
  points_to_next_tier INTEGER,
  site_credit_cents INTEGER,
  credit_expires_at TIMESTAMPTZ,
  next_tier TEXT,
  next_tier_credit_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  insider_threshold INTEGER;
  vip_threshold INTEGER;
  insider_credit INTEGER;
  vip_credit INTEGER;
BEGIN
  SELECT setting_value INTO insider_threshold FROM reward_settings WHERE setting_key = 'insider_threshold';
  SELECT setting_value INTO vip_threshold FROM reward_settings WHERE setting_key = 'vip_threshold';
  SELECT setting_value INTO insider_credit FROM reward_settings WHERE setting_key = 'insider_credit_cents';
  SELECT setting_value INTO vip_credit FROM reward_settings WHERE setting_key = 'vip_credit_cents';
  
  RETURN QUERY
  SELECT 
    COALESCE(ur.total_points, 0),
    COALESCE(ur.lifetime_points, 0),
    COALESCE(ur.current_tier, 'explorer'),
    CASE 
      WHEN COALESCE(ur.current_tier, 'explorer') = 'explorer' THEN insider_threshold - COALESCE(ur.lifetime_points, 0)
      WHEN ur.current_tier = 'insider' THEN vip_threshold - ur.lifetime_points
      ELSE 0
    END,
    COALESCE(CASE 
      WHEN ur.credit_expires_at IS NULL OR ur.credit_expires_at > now() THEN ur.site_credit_cents 
      ELSE 0 
    END, 0),
    ur.credit_expires_at,
    CASE 
      WHEN COALESCE(ur.current_tier, 'explorer') = 'explorer' THEN 'insider'
      WHEN ur.current_tier = 'insider' THEN 'vip'
      ELSE NULL
    END,
    CASE 
      WHEN COALESCE(ur.current_tier, 'explorer') = 'explorer' THEN insider_credit
      WHEN ur.current_tier = 'insider' THEN vip_credit
      ELSE 0
    END
  FROM user_rewards ur
  WHERE ur.user_id = _user_id
  UNION ALL
  SELECT 0, 0, 'explorer', insider_threshold, 0, NULL, 'insider', insider_credit
  WHERE NOT EXISTS (SELECT 1 FROM user_rewards WHERE user_id = _user_id)
  LIMIT 1;
END;
$$;