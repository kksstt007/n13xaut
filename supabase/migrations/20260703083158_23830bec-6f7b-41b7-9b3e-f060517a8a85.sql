
-- Lock down SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_enabled_deposit_methods() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_enabled_deposit_methods() TO authenticated, service_role;

-- Trigger-only functions: revoke direct execution
REVOKE EXECUTE ON FUNCTION public.prevent_sensitive_profile_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_withdrawal_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_withdrawal_risk() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_notification_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_deposit_methods_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_investments_updated_at() FROM PUBLIC, anon, authenticated;

-- Hide admin-only profile columns from all non-service roles
REVOKE SELECT (frozen, banned, risk_score, withdrawal_limit, internal_note)
  ON public.profiles FROM authenticated, anon;

-- Hide internal risk / admin note columns on withdrawals from non-service roles
REVOKE SELECT (risk_flags, admin_note, reviewed_by)
  ON public.withdrawals FROM authenticated, anon;

-- Admin-only read RPCs so the admin console can still see full rows
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_withdrawals()
RETURNS SETOF public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.withdrawals ORDER BY created_at DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_withdrawals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_withdrawals() TO authenticated;
