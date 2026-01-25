-- Add platform fee tracking columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS advisor_payout NUMERIC DEFAULT 0;