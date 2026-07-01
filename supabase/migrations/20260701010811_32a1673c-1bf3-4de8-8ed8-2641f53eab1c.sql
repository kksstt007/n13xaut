
-- Atomic wallet debit/credit helpers to prevent race conditions
CREATE OR REPLACE FUNCTION public.debit_wallet(_user_id uuid, _amount numeric, _lock_delta numeric DEFAULT 0)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric;
BEGIN
  IF _amount < 0 THEN RAISE EXCEPTION 'Amount must be non-negative'; END IF;
  UPDATE public.wallets
    SET usdt_balance = usdt_balance - _amount,
        locked = COALESCE(locked,0) + _lock_delta
    WHERE user_id = _user_id AND usdt_balance >= _amount
    RETURNING usdt_balance INTO new_balance;
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_wallet(_user_id uuid, _amount numeric, _lock_delta numeric DEFAULT 0)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric;
BEGIN
  IF _amount < 0 THEN RAISE EXCEPTION 'Amount must be non-negative'; END IF;
  UPDATE public.wallets
    SET usdt_balance = usdt_balance + _amount,
        locked = GREATEST(0, COALESCE(locked,0) + _lock_delta)
    WHERE user_id = _user_id
    RETURNING usdt_balance INTO new_balance;
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_wallet(uuid, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet(uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, numeric) TO service_role;

-- Server-side withdrawal balance validation trigger
CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal numeric;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be positive';
  END IF;
  SELECT usdt_balance INTO bal FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
  IF bal IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF NEW.amount > bal THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_withdrawal_balance ON public.withdrawals;
CREATE TRIGGER trg_validate_withdrawal_balance
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_balance();
