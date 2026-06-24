
-- 1) Lock down SECURITY DEFINER functions: revoke from public/anon, grant to authenticated (and service_role)
REVOKE EXECUTE ON FUNCTION public.list_enabled_deposit_methods() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_enabled_deposit_methods() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

GRANT EXECUTE ON FUNCTION public.list_enabled_deposit_methods() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Countries: allow both anon and authenticated to read enabled rows
DROP POLICY IF EXISTS "Anyone can view enabled countries" ON public.countries;
CREATE POLICY "Anyone can view enabled countries"
  ON public.countries
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);
GRANT SELECT ON public.countries TO anon;

-- 3) Profiles: restrict self-updates so users cannot modify admin-controlled fields.
--    The existing trigger prevent_sensitive_profile_updates already blocks this,
--    but we also encode it in the RLS WITH CHECK so the policy itself is safe.
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

-- Admins keep full update access
CREATE POLICY "admin update profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users may update only their own row, and only when sensitive admin-managed
-- fields remain unchanged from the existing row.
CREATE POLICY "user update own safe profile fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND frozen           IS NOT DISTINCT FROM (SELECT p.frozen           FROM public.profiles p WHERE p.id = profiles.id)
    AND banned           IS NOT DISTINCT FROM (SELECT p.banned           FROM public.profiles p WHERE p.id = profiles.id)
    AND risk_score       IS NOT DISTINCT FROM (SELECT p.risk_score       FROM public.profiles p WHERE p.id = profiles.id)
    AND withdrawal_limit IS NOT DISTINCT FROM (SELECT p.withdrawal_limit FROM public.profiles p WHERE p.id = profiles.id)
    AND internal_note    IS NOT DISTINCT FROM (SELECT p.internal_note    FROM public.profiles p WHERE p.id = profiles.id)
    AND referred_by      IS NOT DISTINCT FROM (SELECT p.referred_by      FROM public.profiles p WHERE p.id = profiles.id)
    AND referral_code    IS NOT DISTINCT FROM (SELECT p.referral_code    FROM public.profiles p WHERE p.id = profiles.id)
  );
