-- Create admin-only archive table for sensitive verification documents
CREATE TABLE IF NOT EXISTS public.advisor_verification_archive (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES public.advisor_applications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    selfie_url text,
    id_document_url text,
    archived_at timestamp with time zone NOT NULL DEFAULT now(),
    archived_by uuid,
    UNIQUE(application_id)
);

-- Enable RLS on archive table
ALTER TABLE public.advisor_verification_archive ENABLE ROW LEVEL SECURITY;

-- Only admins can access verification archive
CREATE POLICY "Only admins can view verification archive"
ON public.advisor_verification_archive
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert into verification archive"
ON public.advisor_verification_archive
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update verification archive"
ON public.advisor_verification_archive
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete from verification archive"
ON public.advisor_verification_archive
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create function to archive and scrub verification documents when application is reviewed
CREATE OR REPLACE FUNCTION public.archive_verification_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process when status changes to approved or rejected
    IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) THEN
        -- Archive the sensitive documents if they exist
        IF (OLD.selfie_url IS NOT NULL OR OLD.id_document_url IS NOT NULL) THEN
            INSERT INTO public.advisor_verification_archive (
                application_id,
                user_id,
                selfie_url,
                id_document_url,
                archived_by
            ) VALUES (
                NEW.id,
                NEW.user_id,
                OLD.selfie_url,
                OLD.id_document_url,
                NEW.reviewed_by
            )
            ON CONFLICT (application_id) DO UPDATE SET
                selfie_url = EXCLUDED.selfie_url,
                id_document_url = EXCLUDED.id_document_url,
                archived_at = now(),
                archived_by = EXCLUDED.archived_by;
        END IF;
        
        -- Clear sensitive URLs from the main applications table
        NEW.selfie_url := NULL;
        NEW.id_document_url := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically archive documents on status change
DROP TRIGGER IF EXISTS trigger_archive_verification_docs ON public.advisor_applications;
CREATE TRIGGER trigger_archive_verification_docs
    BEFORE UPDATE ON public.advisor_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.archive_verification_documents();