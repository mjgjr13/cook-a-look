-- Create withdrawal requests table for advisor payouts
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  payment_method TEXT,
  payment_details JSONB,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Advisors can view their own withdrawal requests
CREATE POLICY "Advisors can view their own withdrawals"
ON public.withdrawal_requests FOR SELECT
USING (advisor_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Advisors can create withdrawal requests
CREATE POLICY "Advisors can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (advisor_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update withdrawals
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolios', 'portfolios', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder in portfolios bucket
CREATE POLICY "Users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to portfolio images
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios');

-- Allow users to delete their own portfolio images
CREATE POLICY "Users can delete their own portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();