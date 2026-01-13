-- Create user_rewards table to track reward points
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  current_tier TEXT NOT NULL DEFAULT 'bronze',
  points_to_next_tier INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view their own rewards
CREATE POLICY "Users can view their own rewards"
ON public.user_rewards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own rewards (for claiming rewards)
CREATE POLICY "Users can update their own rewards"
ON public.user_rewards
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert rewards for users (via trigger)
CREATE POLICY "Service role can manage all rewards"
ON public.user_rewards
FOR ALL
TO service_role
USING (true);

-- Allow authenticated users to insert their own rewards record
CREATE POLICY "Users can create their own rewards record"
ON public.user_rewards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to automatically add points when a payment is recorded
CREATE OR REPLACE FUNCTION public.add_reward_points()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER;
  client_user_id UUID;
BEGIN
  -- Get the client's user_id from profiles
  SELECT user_id INTO client_user_id
  FROM public.profiles
  WHERE id = NEW.client_id;
  
  -- 1 dollar = 1 point
  points_earned := FLOOR(NEW.amount);
  
  -- Insert or update user rewards
  INSERT INTO public.user_rewards (user_id, total_points, lifetime_points)
  VALUES (client_user_id, points_earned, points_earned)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_rewards.total_points + points_earned,
    lifetime_points = user_rewards.lifetime_points + points_earned,
    current_tier = CASE
      WHEN user_rewards.lifetime_points + points_earned >= 5000 THEN 'platinum'
      WHEN user_rewards.lifetime_points + points_earned >= 2500 THEN 'gold'
      WHEN user_rewards.lifetime_points + points_earned >= 1000 THEN 'silver'
      ELSE 'bronze'
    END,
    points_to_next_tier = CASE
      WHEN user_rewards.lifetime_points + points_earned >= 5000 THEN 0
      WHEN user_rewards.lifetime_points + points_earned >= 2500 THEN 5000 - (user_rewards.lifetime_points + points_earned)
      WHEN user_rewards.lifetime_points + points_earned >= 1000 THEN 2500 - (user_rewards.lifetime_points + points_earned)
      ELSE 1000 - (user_rewards.lifetime_points + points_earned)
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on payments table
CREATE TRIGGER on_payment_add_rewards
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.add_reward_points();

-- Add timestamp trigger
CREATE TRIGGER update_user_rewards_updated_at
BEFORE UPDATE ON public.user_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo availability slots for the next 7 days for all demo advisors
INSERT INTO public.availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
SELECT 
  p.id,
  (CURRENT_DATE + i) + TIME '09:00:00',
  (CURRENT_DATE + i) + TIME '10:00:00',
  true,
  false
FROM public.profiles p
CROSS JOIN generate_series(1, 7) AS i
WHERE p.is_advisor = true;

INSERT INTO public.availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
SELECT 
  p.id,
  (CURRENT_DATE + i) + TIME '11:00:00',
  (CURRENT_DATE + i) + TIME '12:00:00',
  true,
  false
FROM public.profiles p
CROSS JOIN generate_series(1, 7) AS i
WHERE p.is_advisor = true;

INSERT INTO public.availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
SELECT 
  p.id,
  (CURRENT_DATE + i) + TIME '14:00:00',
  (CURRENT_DATE + i) + TIME '15:00:00',
  true,
  false
FROM public.profiles p
CROSS JOIN generate_series(1, 7) AS i
WHERE p.is_advisor = true;

INSERT INTO public.availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
SELECT 
  p.id,
  (CURRENT_DATE + i) + TIME '16:00:00',
  (CURRENT_DATE + i) + TIME '17:00:00',
  true,
  false
FROM public.profiles p
CROSS JOIN generate_series(1, 7) AS i
WHERE p.is_advisor = true;