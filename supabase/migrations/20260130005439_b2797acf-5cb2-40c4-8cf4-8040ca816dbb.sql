-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_payment_add_rewards ON payments;
DROP TRIGGER IF EXISTS add_reward_points_on_payment ON payments;
DROP FUNCTION IF EXISTS add_reward_points() CASCADE;

-- Modify user_rewards table for new tier system
ALTER TABLE public.user_rewards 
  ADD COLUMN IF NOT EXISTS site_credit_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tier_upgraded_at TIMESTAMP WITH TIME ZONE;

-- Create point transactions table for audit log
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  booking_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- Create site credits log for audit
CREATE TABLE IF NOT EXISTS public.site_credits_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create admin reward settings table
CREATE TABLE IF NOT EXISTS public.reward_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Insert default reward settings
INSERT INTO public.reward_settings (setting_key, setting_value, description) VALUES
  ('points_per_booking', 100, 'Points awarded when client completes a booking'),
  ('points_per_review', 50, 'Points awarded when client leaves a verified review'),
  ('points_per_referral', 200, 'Points awarded when referred user completes first booking'),
  ('insider_threshold', 1000, 'Points needed to reach Insider tier'),
  ('vip_threshold', 5000, 'Points needed to reach VIP tier'),
  ('insider_credit_cents', 2500, 'Site credit in cents for Insider tier ($25)'),
  ('vip_credit_cents', 10000, 'Site credit in cents for VIP tier ($100)'),
  ('insider_credit_expiry_days', 90, 'Days until Insider credit expires'),
  ('vip_credit_expiry_days', 365, 'Days until VIP credit expires'),
  ('advisor_fee_reduction_threshold', 9, 'Bookings needed for reduced fee'),
  ('advisor_default_fee_percent', 15, 'Default platform fee percentage'),
  ('advisor_reduced_fee_percent', 5, 'Reduced platform fee percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- Create advisor monthly stats table for tracking booking counts
CREATE TABLE IF NOT EXISTS public.advisor_monthly_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  completed_bookings INTEGER NOT NULL DEFAULT 0,
  reduced_fee_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(advisor_id, month_year)
);

-- Add referral_code to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Enable RLS on new tables
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_credits_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_monthly_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for point_transactions
CREATE POLICY "Users can view their own point transactions"
ON public.point_transactions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all point transactions"
ON public.point_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert point transactions"
ON public.point_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Admins can view all referrals"
ON public.referrals FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for site_credits_log
CREATE POLICY "Users can view their own credit logs"
ON public.site_credits_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credit logs"
ON public.site_credits_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert credit logs"
ON public.site_credits_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for reward_settings
CREATE POLICY "Anyone can view reward settings"
ON public.reward_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can update reward settings"
ON public.reward_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for advisor_monthly_stats
CREATE POLICY "Advisors can view their own monthly stats"
ON public.advisor_monthly_stats FOR SELECT
USING (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all advisor monthly stats"
ON public.advisor_monthly_stats FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));