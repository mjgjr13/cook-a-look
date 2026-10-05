-- Only image files may be uploaded to storage (owner request, audit SEC-07).
-- Lovable Cloud doesn't allow setting allowed_mime_types on buckets, so this is
-- enforced in the storage upload policies instead: the file extension must be
-- jpg/jpeg/png/webp and, when the upload declares a content type, it must be an
-- image type. Existing ownership conditions are kept exactly; existing files
-- are not affected. Size limits remain on the buckets (5MB avatars, 10MB others)
-- and the app resizes photos to 2400px before upload.

CREATE OR REPLACE FUNCTION public.is_allowed_image_object(p_name text, p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT lower(coalesce(storage.extension(p_name), '')) IN ('jpg', 'jpeg', 'png', 'webp')
     AND (
       p_metadata IS NULL
       OR p_metadata->>'mimetype' IS NULL
       OR lower(p_metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp')
     );
$$;

GRANT EXECUTE ON FUNCTION public.is_allowed_image_object(text, jsonb) TO anon, authenticated, service_role;

-- avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_allowed_image_object(name, metadata)
);

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_allowed_image_object(name, metadata)
);

-- portfolios
DROP POLICY IF EXISTS "Users can upload portfolio images" ON storage.objects;
CREATE POLICY "Users can upload portfolio images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolios'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.is_allowed_image_object(name, metadata)
);

-- verifications (selfie + ID; private bucket)
DROP POLICY IF EXISTS "Authenticated users can upload their verification documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload their verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_allowed_image_object(name, metadata)
);

-- lookbook (admin only)
DROP POLICY IF EXISTS "Admins can upload lookbook images" ON storage.objects;
CREATE POLICY "Admins can upload lookbook images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin') AND public.is_allowed_image_object(name, metadata));

DROP POLICY IF EXISTS "Admins can update lookbook images" ON storage.objects;
CREATE POLICY "Admins can update lookbook images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'lookbook' AND public.has_role(auth.uid(), 'admin') AND public.is_allowed_image_object(name, metadata));