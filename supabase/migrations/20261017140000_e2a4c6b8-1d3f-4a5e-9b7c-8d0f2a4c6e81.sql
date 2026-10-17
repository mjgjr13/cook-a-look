-- Email the admin when someone confirms a new account (not on raw sign-up,
-- so bot sign-ups that never confirm don't send anything). Google sign-ins
-- arrive already confirmed, so they're caught on insert.
-- Calls the notify-admin-signup edge function through pg_net with the shared
-- cron secret from Vault. Never blocks or fails the sign-up itself.

CREATE OR REPLACE FUNCTION public.notify_admin_account_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://qdpqfsqjtbvlulekfhoy.supabase.co/functions/v1/notify-admin-signup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'full_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
        'created_at', NEW.created_at
      ),
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admin_account_confirmed failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_admin_account_confirmed() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS notify_admin_on_confirm ON auth.users;
CREATE TRIGGER notify_admin_on_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.notify_admin_account_confirmed();

DROP TRIGGER IF EXISTS notify_admin_on_confirmed_insert ON auth.users;
CREATE TRIGGER notify_admin_on_confirmed_insert
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.notify_admin_account_confirmed();
