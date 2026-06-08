-- Create a public view exposing only safe profile fields, excluding admin-managed fields
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker=on) AS
SELECT id, display_name, avatar_url, country, phone, referral_code, referred_by, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;

-- Restrict SELECT on the base profiles table to admins only.
-- Regular users must read their profile through the safe view.
DROP POLICY IF EXISTS "view own profile" ON public.profiles;

CREATE POLICY "admin select profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));