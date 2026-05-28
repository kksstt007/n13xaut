
-- 1. Extend app_role enum (idempotent)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'risk_analyst';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. Profiles — admin controls
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS withdrawal_limit numeric,
  ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0;

-- 3. Login history
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text,
  user_agent text,
  device_info jsonb,
  country text,
  success boolean NOT NULL DEFAULT true,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view own login history" ON public.login_history;
CREATE POLICY "view own login history" ON public.login_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "insert own login history" ON public.login_history;
CREATE POLICY "insert own login history" ON public.login_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id, created_at DESC);

-- 4. Audit log enhancements + immutability
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS device_info jsonb,
  ADD COLUMN IF NOT EXISTS prev_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text;

GRANT INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

DROP POLICY IF EXISTS "insert own audit" ON public.audit_log;
CREATE POLICY "insert own audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Block UPDATE/DELETE for everyone (no policy = denied under RLS, but also revoke explicitly)
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log(target_type, target_id);

-- 5. Withdrawals risk flags + auto-detect trigger
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.compute_withdrawal_risk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flags jsonb := '[]'::jsonb;
  recent_count int;
  address_seen int;
BEGIN
  -- Large amount
  IF NEW.amount > 1000 THEN
    flags := flags || '["large_amount"]'::jsonb;
  END IF;
  IF NEW.amount > 5000 THEN
    flags := flags || '["very_large_amount"]'::jsonb;
  END IF;
  -- New withdrawal address (first time used)
  SELECT count(*) INTO address_seen
    FROM public.withdrawals
    WHERE user_id = NEW.user_id AND address = NEW.address AND id <> NEW.id;
  IF address_seen = 0 THEN
    flags := flags || '["new_address"]'::jsonb;
  END IF;
  -- Rapid withdrawal (another in last 60s)
  SELECT count(*) INTO recent_count
    FROM public.withdrawals
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '60 seconds'
      AND id <> NEW.id;
  IF recent_count > 0 THEN
    flags := flags || '["rapid_repeat"]'::jsonb;
  END IF;
  NEW.risk_flags := flags;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_withdrawal_risk ON public.withdrawals;
CREATE TRIGGER trg_compute_withdrawal_risk
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.compute_withdrawal_risk();
