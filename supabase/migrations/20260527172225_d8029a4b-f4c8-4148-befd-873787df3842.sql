
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usdt_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  locked NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX ON public.kyc_submissions(user_id);
CREATE INDEX ON public.kyc_submissions(status);

CREATE TABLE public.deposit_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL, -- TRC20/ERC20/BEP20
  asset TEXT NOT NULL DEFAULT 'USDT',
  deposit_address TEXT NOT NULL,
  min_deposit NUMERIC(18,2) NOT NULL DEFAULT 10,
  fee NUMERIC(18,4) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_id UUID REFERENCES public.deposit_methods(id),
  network TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX ON public.deposits(user_id);
CREATE INDEX ON public.deposits(status);

CREATE TABLE public.withdrawal_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.withdrawal_addresses(user_id);

CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  fee NUMERIC(18,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX ON public.withdrawals(user_id);
CREATE INDEX ON public.withdrawals(status);

CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL DEFAULT 'XAU/USDT',
  direction TEXT NOT NULL, -- buy/sell
  amount NUMERIC(18,2) NOT NULL,
  payout_pct NUMERIC(6,2) NOT NULL DEFAULT 85, -- profit %
  duration_sec INT NOT NULL,
  open_price NUMERIC(18,4) NOT NULL,
  close_price NUMERIC(18,4),
  result TEXT, -- win/loss/draw
  pnl NUMERIC(18,2),
  status TEXT NOT NULL DEFAULT 'open', -- open/settled
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ
);
CREATE INDEX ON public.trades(user_id);
CREATE INDEX ON public.trades(status);

CREATE TABLE public.trade_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_result TEXT, -- win/loss/null
  default_result TEXT, -- win/loss/random
  win_payout_pct NUMERIC(6,2) NOT NULL DEFAULT 85,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.market_settings (
  id INT PRIMARY KEY DEFAULT 1,
  base_price NUMERIC(18,4) NOT NULL DEFAULT 2350.0,
  drift_bias NUMERIC(8,5) NOT NULL DEFAULT 0,
  volatility NUMERIC(8,5) NOT NULL DEFAULT 1.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
INSERT INTO public.market_settings (id) VALUES (1);

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile, wallet, default role, optional referral on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
BEGIN
  ref_code := upper(substr(replace(NEW.id::text,'-',''),1,8));
  -- find referrer via raw_user_meta_data->>'ref'
  IF NEW.raw_user_meta_data ? 'ref' THEN
    SELECT id INTO referrer FROM public.profiles WHERE referral_code = upper(NEW.raw_user_meta_data->>'ref') LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, display_name, referral_code, referred_by)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), ref_code, referrer);

  INSERT INTO public.wallets (user_id, usdt_balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referee_id) VALUES (referrer, NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed deposit methods
INSERT INTO public.deposit_methods (network, deposit_address, min_deposit, fee, notes) VALUES
('TRC20','TXYZdemoTronAddress0000000000000000', 10, 1, 'Tron network - fastest & cheapest'),
('ERC20','0xDemoEthereumAddress00000000000000000000', 50, 8, 'Ethereum - higher fees'),
('BEP20','0xDemoBSCAddress000000000000000000000000', 10, 0.8, 'BNB Smart Chain');

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.wallets, public.kyc_submissions, public.deposits, public.withdrawal_addresses, public.withdrawals, public.trades, public.referrals TO authenticated;
GRANT SELECT ON public.deposit_methods, public.market_settings TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
-- profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- wallets
CREATE POLICY "view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update wallet" ON public.wallets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- kyc
CREATE POLICY "view own kyc" ON public.kyc_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own kyc" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update kyc" ON public.kyc_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- deposit_methods (public-readable for authenticated)
CREATE POLICY "view methods" ON public.deposit_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage methods" ON public.deposit_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- deposits
CREATE POLICY "view own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own deposits" ON public.deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update deposits" ON public.deposits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- withdrawal addresses
CREATE POLICY "view own addresses" ON public.withdrawal_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "manage own addresses" ON public.withdrawal_addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- withdrawals
CREATE POLICY "view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- trades
CREATE POLICY "view own trades" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
-- inserts/updates go through server fns (service role), but allow user inserts as fallback
CREATE POLICY "insert own trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- trade_overrides
CREATE POLICY "admin manage overrides" ON public.trade_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- market_settings
CREATE POLICY "view market" ON public.market_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update market" ON public.market_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- referrals
CREATE POLICY "view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR public.has_role(auth.uid(),'admin'));

-- audit_log
CREATE POLICY "admin view audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Storage bucket for KYC
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "kyc upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc view own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
