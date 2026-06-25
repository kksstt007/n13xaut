
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
  -- Phone can be set once by the user, but never changed afterwards.
  IF OLD.phone IS NOT NULL
     AND NEW.phone IS DISTINCT FROM OLD.phone THEN
    RAISE EXCEPTION 'Phone number cannot be changed once set. Contact support.';
  END IF;
  RETURN NEW;
END;
$$;
