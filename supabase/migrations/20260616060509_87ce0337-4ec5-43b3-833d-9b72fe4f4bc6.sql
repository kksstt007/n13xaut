
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level int NOT NULL,
  plan_name text NOT NULL,
  amount numeric(18,2) NOT NULL,
  daily_rate numeric(6,4) NOT NULL,
  term_days int NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  last_payout_at timestamptz NOT NULL DEFAULT now(),
  total_paid numeric(18,2) NOT NULL DEFAULT 0,
  principal_returned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own investments" ON public.investments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX investments_user_id_idx ON public.investments(user_id);
CREATE INDEX investments_status_idx ON public.investments(status);

CREATE OR REPLACE FUNCTION public.touch_investments_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER investments_touch_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.touch_investments_updated_at();
