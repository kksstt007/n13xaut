-- Extend deposit_methods to support country-based bank/crypto methods
ALTER TABLE public.deposit_methods
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS method_type text NOT NULL DEFAULT 'crypto',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.deposit_methods ALTER COLUMN deposit_address DROP NOT NULL;

-- Add country to withdrawals for tracking
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS method_id uuid,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_name text;

-- Enable realtime on deposit_methods so users see admin updates instantly
ALTER TABLE public.deposit_methods REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deposit_methods'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_methods';
  END IF;
END $$;

-- Trigger to bump updated_at
CREATE OR REPLACE FUNCTION public.touch_deposit_methods_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_deposit_methods ON public.deposit_methods;
CREATE TRIGGER trg_touch_deposit_methods
  BEFORE UPDATE ON public.deposit_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_deposit_methods_updated_at();