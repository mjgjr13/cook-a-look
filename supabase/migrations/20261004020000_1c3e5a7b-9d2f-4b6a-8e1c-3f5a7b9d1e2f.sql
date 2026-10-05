-- SECURITY HARDENING (audit SEC-07), 2026-10-04.
-- Restrict uploads to the image types the app actually uses, with size caps,
-- so public buckets can't be used to host HTML/SVG/script files.
-- Matches the client-side checks (ProfilePhotoUpload, PortfolioUpload,
-- BecomeAdvisor, IDUploadWithCamera). Existing files are not affected.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880 -- 5 MB
WHERE id = 'avatars';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 10485760 -- 10 MB (PortfolioUpload allows 10 MB)
WHERE id = 'portfolios';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 10485760
WHERE id = 'lookbook';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 10485760
WHERE id = 'verifications';
