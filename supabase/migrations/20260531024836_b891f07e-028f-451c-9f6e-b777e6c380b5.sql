CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.countries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled countries"
ON public.countries
FOR SELECT
TO authenticated
USING (enabled = true);

CREATE POLICY "Admins can manage countries"
ON public.countries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default countries
INSERT INTO public.countries (code, name, flag_emoji, sort_order, enabled) VALUES
  ('GLOBAL', 'Global', '🌍', 0, true),
  ('MM', 'Myanmar', '🇲🇲', 1, true),
  ('TH', 'Thailand', '🇹🇭', 2, true),
  ('SG', 'Singapore', '🇸🇬', 3, true),
  ('US', 'United States', '🇺🇸', 4, true)
ON CONFLICT (code) DO NOTHING;