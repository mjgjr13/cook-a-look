-- ============================================================
-- Rewards / referral audit fixes (July 2026 pre-launch)
--
-- 1) award_client_points: the June 11 hardening migration
--    (20260611030506) revoked EXECUTE from authenticated, which
--    silently broke the admin "Manual Award" flow in
--    AdminRewards.tsx (permission denied at runtime). Re-grant to
--    authenticated but add an internal authorization guard so only
--    admins, service_role, or internal system triggers can call it.
-- 2) Booking-completion points: add a ledger-based dedup guard so a
--    booking can never award points twice, even if its status ever
--    flaps away from and back to 'completed'.
-- 3) Review points: reward_settings has had points_per_review since
--    January and the dashboard advertises it, but nothing ever
--    awarded review points. Add the missing trigger (deduped per
--    booking; one review per booking is already enforced by a
--    unique constraint + RLS).
-- 4) get_client_rewards_summary: was callable by any authenticated
--    (and anon) user with an arbitrary _user_id, exposing any
--    user's points/credit balance by ID guessing. Add owner/admin
--    guard.
-- 5) get_advisor_monthly_stats: same issue — anyone could read any
--    advisor's monthly booking counts (and insert stats rows). Add
--    owner/admin guard.
-- 6) redeem_site_credits: was executable by any authenticated user
--    with an arbitrary _user_id, letting anyone burn another user's
--    site credits. Nothing in the app calls it yet (checkout does
--    not consume credits), so lock it to service_role until the
--    checkout integration exists.
-- 7) user_rewards: after 20260605220759 dropped the self-service
--    policies, admins had no SELECT/UPDATE/INSERT access, so the
--    AdminRewards "Users" tab showed nothing and manual credit
--    issuance silently updated 0 rows while still writing a
--    site_credits_log entry (ledger drift). Add admin policies.
--    Also fix the stale 'bronze' default tier ('bronze' is not a
--    tier in the current system and crashes ClientRewardsCard).
-- ============================================================

-- ------------------------------------------------------------
-- 1) award_client_points with internal authorization guard
-- ------------------------------------------------------------
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
  -- Authorization: allow service_role, admins, or internal system
  -- triggers (which set app.reward_context before calling). Direct
  -- RPC calls from regular users are rejected.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND current_setting('app.reward_context', true) IS DISTINCT FROM 'system_award'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.award_client_points(uuid, text, integer, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_client_points(uuid, text, integer, text, uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2) Booking-completion points: dedup per booking + set the
--    system context before calling award_client_points
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_points_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_user_id UUID;
  points_value INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Never award twice for the same booking (guards against status
    -- flapping completed -> other -> completed)
    IF EXISTS (
      SELECT 1 FROM point_transactions
      WHERE action_type = 'booking_completed' AND reference_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT user_id INTO client_user_id FROM profiles WHERE id = NEW.client_id;
    SELECT setting_value INTO points_value FROM reward_settings WHERE setting_key = 'points_per_booking';

    IF client_user_id IS NOT NULL AND points_value IS NOT NULL THEN
      PERFORM set_config('app.reward_context', 'system_award', true);
      PERFORM award_client_points(
        client_user_id,
        'booking_completed',
        points_value,
        'Completed booking with advisor',
        NEW.id
      );
      PERFORM set_config('app.reward_context', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------
-- 3) Review points: missing trigger (points_per_review was never
--    awarded anywhere)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_points_on_review_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_user_id UUID;
  points_value INTEGER;
BEGIN
  -- One award per booking, even if a review is deleted and re-created
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE action_type = 'review_submitted' AND reference_id = NEW.booking_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO client_user_id FROM profiles WHERE id = NEW.client_id;
  SELECT setting_value INTO points_value FROM reward_settings WHERE setting_key = 'points_per_review';

  IF client_user_id IS NOT NULL AND points_value IS NOT NULL THEN
    PERFORM set_config('app.reward_context', 'system_award', true);
    PERFORM award_client_points(
      client_user_id,
      'review_submitted',
      points_value,
      'Left a review',
      NEW.booking_id
    );
    PERFORM set_config('app.reward_context', '', true);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS award_points_on_review ON public.advisor_reviews;
CREATE TRIGGER award_points_on_review
AFTER INSERT ON public.advisor_reviews
FOR EACH ROW
EXECUTE FUNCTION award_points_on_review_submit();

-- ------------------------------------------------------------
-- 4) get_client_rewards_summary: owner/admin only
-- ------------------------------------------------------------
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
SET search_path TO 'public'
AS $function$
DECLARE
  insider_threshold INTEGER;
  vip_threshold INTEGER;
  insider_credit INTEGER;
  vip_credit INTEGER;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
  THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_client_rewards_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_rewards_summary(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 5) get_advisor_monthly_stats: owning advisor or admin only
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_advisor_monthly_stats(advisor_profile_id UUID)
RETURNS TABLE(
  completed_bookings INTEGER,
  reduced_fee_unlocked BOOLEAN,
  bookings_until_reduced INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  threshold INTEGER;
BEGIN
  IF NOT EXISTS (
       SELECT 1 FROM profiles p
       WHERE p.id = advisor_profile_id AND p.user_id = auth.uid()
     )
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
  THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  current_month := to_char(now(), 'YYYY-MM');

  SELECT setting_value INTO threshold
  FROM reward_settings
  WHERE setting_key = 'advisor_fee_reduction_threshold';

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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_advisor_monthly_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_advisor_monthly_stats(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 6) redeem_site_credits: service_role only until checkout
--    actually consumes credits (any authenticated user could
--    previously burn any other user's credits by passing their id)
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.redeem_site_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_site_credits(uuid, integer, text) TO service_role;

-- ------------------------------------------------------------
-- 7) user_rewards: admin access + stale default tier
-- ------------------------------------------------------------
ALTER TABLE public.user_rewards ALTER COLUMN current_tier SET DEFAULT 'explorer';

-- 'bronze'/'silver'/'gold'/'platinum' are from the pre-January tier
-- system; the UI only knows explorer/insider/vip and crashes on others.
UPDATE public.user_rewards
SET current_tier = 'explorer'
WHERE current_tier NOT IN ('explorer', 'insider', 'vip');

DROP POLICY IF EXISTS "Admins can view all rewards" ON public.user_rewards;
CREATE POLICY "Admins can view all rewards"
ON public.user_rewards FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert rewards" ON public.user_rewards;
CREATE POLICY "Admins can insert rewards"
ON public.user_rewards FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update rewards" ON public.user_rewards;
CREATE POLICY "Admins can update rewards"
ON public.user_rewards FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
