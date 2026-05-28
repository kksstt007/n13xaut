
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
