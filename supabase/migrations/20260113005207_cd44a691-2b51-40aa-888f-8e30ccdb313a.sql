-- Add enhanced advisor profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_demographics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{English}',
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personal_philosophy TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'client' CHECK (account_type IN ('client', 'advisor'));

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_style_tags ON public.profiles USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_profiles_target_demographics ON public.profiles USING GIN(target_demographics);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_advisor ON public.profiles(is_advisor);

-- Create payments table for tracking transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id),
  client_id UUID NOT NULL,
  advisor_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments as client"
  ON public.payments FOR SELECT
  USING (auth.uid()::text = client_id::text OR auth.uid()::text IN (
    SELECT user_id::text FROM public.profiles WHERE id = advisor_id
  ));

CREATE POLICY "Users can insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid()::text = client_id::text);

-- Create video_sessions table for Daily.co
CREATE TABLE IF NOT EXISTS public.video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on video_sessions
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- Video session policies
CREATE POLICY "Participants can view their video sessions"
  ON public.video_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = video_sessions.booking_id
      AND (
        b.client_id::text = auth.uid()::text 
        OR b.advisor_id::text IN (SELECT id::text FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Update updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();