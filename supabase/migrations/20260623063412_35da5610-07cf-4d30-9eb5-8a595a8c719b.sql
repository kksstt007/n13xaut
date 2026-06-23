
-- 1. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.deposit_methods;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- 2. Tighten deposit_methods SELECT policy to enabled rows only
DROP POLICY IF EXISTS "view methods" ON public.deposit_methods;
CREATE POLICY "view enabled methods" ON public.deposit_methods
  FOR SELECT TO authenticated
  USING (enabled = true OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Add WITH CHECK to profiles update policy to enforce ownership at the policy level.
-- Column-level protection of admin-managed fields (frozen, banned, risk_score,
-- withdrawal_limit, internal_note, referred_by, referral_code) is enforced by the
-- existing prevent_sensitive_profile_updates trigger.
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Ensure the protection trigger is attached (idempotent)
DROP TRIGGER IF EXISTS prevent_sensitive_profile_updates_trg ON public.profiles;
CREATE TRIGGER prevent_sensitive_profile_updates_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();
