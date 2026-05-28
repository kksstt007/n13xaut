
REVOKE ALL ON FUNCTION public.compute_withdrawal_risk() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_withdrawal_risk() TO service_role;
