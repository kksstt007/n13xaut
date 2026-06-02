-- Link deposit_methods to countries via FK, add sort_order and flow (deposit/withdraw/both)
ALTER TABLE public.deposit_methods
  ADD COLUMN IF NOT EXISTS country_code text REFERENCES public.countries(code) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flow text NOT NULL DEFAULT 'both';

ALTER TABLE public.deposit_methods
  DROP CONSTRAINT IF EXISTS deposit_methods_flow_check;
ALTER TABLE public.deposit_methods
  ADD CONSTRAINT deposit_methods_flow_check CHECK (flow IN ('deposit','withdraw','both'));

-- Backfill country_code from legacy country (text) by matching countries.name
UPDATE public.deposit_methods m
SET country_code = c.code
FROM public.countries c
WHERE m.country_code IS NULL
  AND m.country IS NOT NULL
  AND lower(trim(m.country)) = lower(c.name);

CREATE INDEX IF NOT EXISTS idx_deposit_methods_country_code ON public.deposit_methods(country_code);
CREATE INDEX IF NOT EXISTS idx_deposit_methods_sort ON public.deposit_methods(country_code, sort_order);