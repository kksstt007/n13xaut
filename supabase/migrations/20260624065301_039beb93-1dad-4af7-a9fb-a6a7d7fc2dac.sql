
-- Remove broad authenticated SELECT on deposit_methods to avoid leaking
-- bank account numbers, deposit addresses, and bank names to all users.
DROP POLICY IF EXISTS "view enabled methods" ON public.deposit_methods;

-- Listing function: returns only non-sensitive fields needed to render the
-- method list. Safe to call by any authenticated user.
CREATE OR REPLACE FUNCTION public.list_enabled_deposit_methods()
RETURNS TABLE (
  id uuid,
  network text,
  asset text,
  enabled boolean,
  min_deposit numeric,
  fee numeric,
  notes text,
  country text,
  country_code text,
  sort_order integer,
  flow text,
  display_name text,
  method_type text,
  instructions text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, network, asset, enabled, min_deposit, fee, notes, country,
         country_code, sort_order, flow, display_name, method_type,
         instructions, created_at, updated_at
  FROM public.deposit_methods
  WHERE enabled = true
  ORDER BY sort_order, network;
$$;

REVOKE ALL ON FUNCTION public.list_enabled_deposit_methods() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_enabled_deposit_methods() TO authenticated;

-- Detail function: returns the full record for a single enabled method,
-- including sensitive destination fields. Authenticated users must request
-- a specific id rather than enumerating all methods.
CREATE OR REPLACE FUNCTION public.get_deposit_method_details(_id uuid)
RETURNS TABLE (
  id uuid,
  network text,
  asset text,
  enabled boolean,
  min_deposit numeric,
  fee numeric,
  notes text,
  country text,
  country_code text,
  sort_order integer,
  flow text,
  display_name text,
  method_type text,
  instructions text,
  deposit_address text,
  bank_name text,
  account_name text,
  account_number text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, network, asset, enabled, min_deposit, fee, notes, country,
         country_code, sort_order, flow, display_name, method_type,
         instructions, deposit_address, bank_name, account_name,
         account_number, created_at, updated_at
  FROM public.deposit_methods
  WHERE id = _id AND enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_deposit_method_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deposit_method_details(uuid) TO authenticated;
