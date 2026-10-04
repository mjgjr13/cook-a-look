-- Support scheduled deletion of advisor verification photos (BIPA 15(a)-style
-- retention schedule promised in the Privacy Policy). The existing
-- selfie_url/id_document_url columns store 1-year *signed URLs*, not the raw
-- storage path, so there was no reliable way to delete the underlying object
-- once we could no longer construct/re-derive its path. Add explicit path
-- columns (populated going forward by BecomeAdvisor.tsx) and a completion
-- marker so the deletion job is idempotent and auditable.
ALTER TABLE public.advisor_applications
  ADD COLUMN IF NOT EXISTS selfie_storage_path text,
  ADD COLUMN IF NOT EXISTS id_document_storage_path text,
  ADD COLUMN IF NOT EXISTS verification_photos_deleted_at timestamptz;

-- Best-effort backfill: extract the object path from existing signed URLs of
-- the form ".../storage/v1/object/sign/verifications/<path>?token=...". Rows
-- whose URL doesn't match this shape (or is null) are left NULL and will be
-- skipped by the deletion job rather than guessed at.
UPDATE public.advisor_applications
SET selfie_storage_path = substring(selfie_url from 'verifications/([^?]+)')
WHERE selfie_url IS NOT NULL
  AND selfie_storage_path IS NULL
  AND selfie_url LIKE '%/storage/v1/object/sign/verifications/%';

UPDATE public.advisor_applications
SET id_document_storage_path = substring(id_document_url from 'verifications/([^?]+)')
WHERE id_document_url IS NOT NULL
  AND id_document_storage_path IS NULL
  AND id_document_url LIKE '%/storage/v1/object/sign/verifications/%';

-- The deletion edge function runs with the service role and needs to find
-- eligible rows quickly.
CREATE INDEX IF NOT EXISTS idx_advisor_applications_deletion_eligibility
  ON public.advisor_applications (status, created_at, reviewed_at)
  WHERE verification_photos_deleted_at IS NULL;