
-- 1) Remove sensitive tables from realtime publication (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='trades') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.trades';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='deposits') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.deposits';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='withdrawals') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.withdrawals';
  END IF;
END $$;

-- 2) Wallets: explicit deny INSERT for authenticated (no policy = no insert, but be explicit)
REVOKE INSERT ON public.wallets FROM authenticated;

-- 3) Profiles: prevent self-modification of sensitive fields via trigger
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.frozen IS DISTINCT FROM OLD.frozen
    OR NEW.banned IS DISTINCT FROM OLD.banned
    OR NEW.risk_score IS DISTINCT FROM OLD.risk_score
    OR NEW.withdrawal_limit IS DISTINCT FROM OLD.withdrawal_limit
    OR NEW.internal_note IS DISTINCT FROM OLD.internal_note
    OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
    OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Not authorized to modify admin-managed fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_sensitive_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();

-- 4) Audit log: remove user insert ability (system/admin writes only)
DROP POLICY IF EXISTS "insert own audit" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated;
