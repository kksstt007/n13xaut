
-- Tighten trades: remove user INSERT, force via server fn (admin client)
DROP POLICY IF EXISTS "insert own trades" ON public.trades;

-- Tighten deposits: enforce pending status, positive amount, no admin_note/reviewed fields
DROP POLICY IF EXISTS "insert own deposits" ON public.deposits;
CREATE POLICY "insert own deposits" ON public.deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND amount > 0
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note IS NULL
  );

-- Tighten withdrawals similarly
DROP POLICY IF EXISTS "insert own withdrawals" ON public.withdrawals;
CREATE POLICY "insert own withdrawals" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND amount > 0
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note IS NULL
  );

-- Storage: lock down kyc-documents UPDATE/DELETE to admins only
CREATE POLICY "kyc admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));
