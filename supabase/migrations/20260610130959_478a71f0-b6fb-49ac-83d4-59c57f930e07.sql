-- Restore self-read on profiles (safe: profiles_safe view uses security_invoker and requires this)
CREATE POLICY "view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Restrict market_settings reads to admins only (synthetic price params are internal)
DROP POLICY IF EXISTS "view market" ON public.market_settings;
CREATE POLICY "admin view market" ON public.market_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.market_settings FROM authenticated;
GRANT SELECT ON public.market_settings TO authenticated;