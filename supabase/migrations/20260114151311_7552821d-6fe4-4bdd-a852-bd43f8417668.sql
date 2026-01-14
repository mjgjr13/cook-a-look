-- Fix 1: Drop overly permissive INSERT policy for advisor_applications
DROP POLICY IF EXISTS "Users can create applications" ON public.advisor_applications;

-- Create new policy requiring authentication and user_id match
CREATE POLICY "Authenticated users can create their own applications"
ON public.advisor_applications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- Add unique constraint to prevent duplicate applications per user
ALTER TABLE public.advisor_applications
  ADD CONSTRAINT unique_user_application UNIQUE(user_id);

-- Fix 2: Drop overly permissive storage INSERT policy for verifications
DROP POLICY IF EXISTS "Users can upload verification documents" ON storage.objects;

-- Create authenticated upload policy with user-scoped folders
CREATE POLICY "Authenticated users can upload their verification documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own verification documents
CREATE POLICY "Users can view their own verification documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'verifications'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own verification documents
CREATE POLICY "Users can delete their own verification documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'verifications'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Set file size limit for verifications bucket (5MB)
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'verifications';