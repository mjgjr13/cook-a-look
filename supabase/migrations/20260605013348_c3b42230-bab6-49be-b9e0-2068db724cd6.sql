CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_advisor_id uuid,
  p_date date,
  p_duration_minutes integer DEFAULT 60,
  p_buffer_minutes integer DEFAULT 15
)
RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_virtual boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_booking_window_end := CURRENT_DATE + INTERVAL '1 month';
  IF p_date > v_booking_window_end THEN RETURN; END IF;
  IF p_date < CURRENT_DATE THEN RETURN; END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  SELECT COALESCE(ap.timezone, 'UTC') INTO v_advisor_tz
  FROM advisor_profiles ap
  JOIN profiles p ON p.user_id = ap.user_id
  WHERE p.id = p_advisor_id;
  IF v_advisor_tz IS NULL THEN v_advisor_tz := 'UTC'; END IF;

  SELECT TRUE, ado.is_available, ado.start_time, ado.end_time
  INTO v_has_date_override, v_date_override_available, v_override_start, v_override_end
  FROM advisor_date_overrides ado
  WHERE ado.advisor_id = p_advisor_id AND ado.override_date = p_date;

  IF v_has_date_override AND NOT v_date_override_available THEN RETURN; END IF;

  IF v_has_date_override AND v_date_override_available THEN
    v_window_start := v_override_start;
    v_window_end := v_override_end;
    v_window_is_virtual := TRUE;
  ELSE
    SELECT aw.start_time, aw.end_time, aw.is_virtual
    INTO v_window_start, v_window_end, v_window_is_virtual
    FROM advisor_availability_windows aw
    WHERE aw.advisor_id = p_advisor_id AND aw.day_of_week = v_day_of_week;
    IF NOT FOUND THEN RETURN; END IF;
  END IF;

  v_current_slot := (p_date || ' ' || v_window_start)::TIMESTAMP AT TIME ZONE v_advisor_tz;

  WHILE v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL <=
        (p_date || ' ' || v_window_end)::TIMESTAMP AT TIME ZONE v_advisor_tz
  LOOP
    v_slot_end := v_current_slot + (p_duration_minutes || ' minutes')::INTERVAL;

    IF NOT EXISTS (
      SELECT 1 FROM availability_slots s
      JOIN bookings b ON b.slot_id = s.id
      WHERE s.advisor_id = p_advisor_id
        AND b.status IN ('confirmed', 'pending')
        AND s.start_time < v_slot_end
        AND s.end_time > v_current_slot
    )
    AND NOT EXISTS (
      SELECT 1 FROM advisor_availability_breaks brk
      WHERE brk.advisor_id = p_advisor_id
        AND brk.day_of_week = v_day_of_week
        AND (
          ((p_date || ' ' || brk.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || brk.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM advisor_date_blocks db
      WHERE db.advisor_id = p_advisor_id
        AND db.block_date = p_date
        AND (
          ((p_date || ' ' || db.start_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) < v_slot_end
          AND ((p_date || ' ' || db.end_time)::TIMESTAMP AT TIME ZONE v_advisor_tz) > v_current_slot
        )
    )
    AND (p_date > CURRENT_DATE OR v_current_slot > NOW())
    THEN
      slot_start := v_current_slot;
      slot_end := v_slot_end;
      is_virtual := v_window_is_virtual;
      RETURN NEXT;
      v_current_slot := v_current_slot + INTERVAL '1 hour';
    ELSE
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
      IF NOT FOUND THEN
        v_current_slot := v_current_slot + INTERVAL '1 hour';
      END IF;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_client_points(
  _user_id uuid,
  _action_type text,
  _points integer,
  _description text DEFAULT NULL::text,
  _reference_id uuid DEFAULT NULL::uuid,
  _created_by uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_total INTEGER;
  new_lifetime INTEGER;
  v_current_tier TEXT;
  new_tier TEXT;
  insider_threshold INTEGER;
  vip_threshold INTEGER;
  insider_credit INTEGER;
  vip_credit INTEGER;
  insider_expiry INTEGER;
  vip_expiry INTEGER;
BEGIN
  SELECT setting_value INTO insider_threshold FROM reward_settings WHERE setting_key = 'insider_threshold';
  SELECT setting_value INTO vip_threshold FROM reward_settings WHERE setting_key = 'vip_threshold';
  SELECT setting_value INTO insider_credit FROM reward_settings WHERE setting_key = 'insider_credit_cents';
  SELECT setting_value INTO vip_credit FROM reward_settings WHERE setting_key = 'vip_credit_cents';
  SELECT setting_value INTO insider_expiry FROM reward_settings WHERE setting_key = 'insider_credit_expiry_days';
  SELECT setting_value INTO vip_expiry FROM reward_settings WHERE setting_key = 'vip_credit_expiry_days';

  INSERT INTO point_transactions (user_id, action_type, points, description, reference_id, created_by)
  VALUES (_user_id, _action_type, _points, _description, _reference_id, _created_by);

  INSERT INTO user_rewards (user_id, total_points, lifetime_points, current_tier)
  VALUES (_user_id, _points, _points, 'explorer')
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_rewards.total_points + _points,
    lifetime_points = user_rewards.lifetime_points + _points,
    updated_at = now()
  RETURNING user_rewards.total_points, user_rewards.lifetime_points, user_rewards.current_tier
  INTO new_total, new_lifetime, v_current_tier;

  IF new_lifetime >= vip_threshold THEN
    new_tier := 'vip';
  ELSIF new_lifetime >= insider_threshold THEN
    new_tier := 'insider';
  ELSE
    new_tier := 'explorer';
  END IF;

  IF new_tier <> v_current_tier THEN
    IF new_tier = 'insider' AND v_current_tier = 'explorer' THEN
      UPDATE user_rewards SET
        current_tier = 'insider',
        site_credit_cents = site_credit_cents + insider_credit,
        credit_expires_at = now() + (insider_expiry || ' days')::INTERVAL,
        tier_upgraded_at = now(),
        points_to_next_tier = vip_threshold - new_lifetime
      WHERE user_id = _user_id;

      INSERT INTO site_credits_log (user_id, action_type, amount_cents, balance_after_cents, description)
      SELECT _user_id, 'tier_upgrade', insider_credit, ur.site_credit_cents, 'Insider tier upgrade bonus'
      FROM user_rewards ur WHERE ur.user_id = _user_id;

    ELSIF new_tier = 'vip' AND v_current_tier IN ('explorer', 'insider') THEN
      UPDATE user_rewards SET
        current_tier = 'vip',
        site_credit_cents = site_credit_cents + vip_credit,
        credit_expires_at = now() + (vip_expiry || ' days')::INTERVAL,
        tier_upgraded_at = now(),
        points_to_next_tier = 0
      WHERE user_id = _user_id;

      INSERT INTO site_credits_log (user_id, action_type, amount_cents, balance_after_cents, description)
      SELECT _user_id, 'tier_upgrade', vip_credit, ur.site_credit_cents, 'VIP tier upgrade bonus'
      FROM user_rewards ur WHERE ur.user_id = _user_id;
    END IF;
  ELSE
    UPDATE user_rewards SET
      points_to_next_tier = CASE
        WHEN v_current_tier = 'explorer' THEN insider_threshold - new_lifetime
        WHEN v_current_tier = 'insider' THEN vip_threshold - new_lifetime
        ELSE 0
      END
    WHERE user_id = _user_id;
  END IF;
END;
$function$;