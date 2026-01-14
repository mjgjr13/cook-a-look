-- Create advisor_applications table to track pending applications
CREATE TABLE IF NOT EXISTS public.advisor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT NOT NULL,
  experience TEXT,
  bio TEXT NOT NULL,
  virtual BOOLEAN DEFAULT true,
  in_person BOOLEAN DEFAULT false,
  instagram TEXT NOT NULL,
  tiktok TEXT,
  linkedin TEXT,
  portfolio TEXT,
  selfie_url TEXT,
  id_document_url TEXT,
  liveness_verified BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advisor_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.advisor_applications
FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Users can create their own applications
CREATE POLICY "Users can create applications"
ON public.advisor_applications
FOR INSERT
WITH CHECK (true);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.advisor_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON public.advisor_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add demo_availability_enabled column to profiles for admin control
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS demo_availability_enabled BOOLEAN DEFAULT false;

-- Create trigger for updated_at
CREATE TRIGGER update_advisor_applications_updated_at
BEFORE UPDATE ON public.advisor_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can view verification documents
CREATE POLICY "Admins can view verification documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'verifications' AND has_role(auth.uid(), 'admin'::app_role));

-- Anyone can upload to verifications (for applications)
CREATE POLICY "Users can upload verification documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'verifications');