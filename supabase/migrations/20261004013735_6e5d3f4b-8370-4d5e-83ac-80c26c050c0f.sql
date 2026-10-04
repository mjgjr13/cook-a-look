-- Schedule the verification-photo retention/deletion job (see
-- supabase/functions/delete-expired-verifications). Uses the same
-- vault + pg_cron + pg_net pattern already established for
-- process-email-queue in 20260611041713_email_infra.sql.
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ============================================================
-- POST-MIGRATION STEPS (apply via the Supabase SQL editor or
-- Management API - contain the project's service_role key, which
-- must never be committed to this repo)
-- ============================================================
--
-- 1. VAULT SECRET
--    Store the service_role key in Vault (upsert - use vault.update_secret
--    if 'verification_deletion_service_role_key' already exists):
--
--      select vault.create_secret(
--        '<paste the service_role key from Project Settings -> API>',
--        'verification_deletion_service_role_key'
--      );
--
--    To revert: delete from vault.secrets where name = 'verification_deletion_service_role_key';
--
-- 2. CRON JOB
--    Runs daily at 03:00 UTC and calls the edge function with the
--    vault-stored service_role key as the Authorization bearer token
--    (the function itself verifies this via verify_jwt=true plus an
--    explicit role check - see delete-expired-verifications/index.ts).
--
--      select cron.schedule(
--        'delete-expired-verifications',
--        '0 3 * * *',
--        $$
--        select net.http_post(
--          url := 'https://chjmyzzczwattluqpbat.supabase.co/functions/v1/delete-expired-verifications',
--          headers := jsonb_build_object(
--            'Authorization', 'Bearer ' || (
--              select decrypted_secret from vault.decrypted_secrets
--              where name = 'verification_deletion_service_role_key'
--            ),
--            'Content-Type', 'application/json'
--          ),
--          body := '{}'::jsonb
--        );
--        $$
--      );
--
--    To revert: select cron.unschedule('delete-expired-verifications');
--
--    To dry-run first (logs what would be deleted without deleting anything):
--    call the function once manually with ?dryRun=true and the same
--    Authorization header, and check the response body.