
DELETE FROM public.user_roles
WHERE user_id = '864adf50-4777-450a-ad18-7bdc2ecf0f01' AND role = 'admin';

INSERT INTO public.user_roles (user_id, role)
VALUES ('06d211e8-208a-4dc2-9188-d95d2720f558', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = '06d211e8-208a-4dc2-9188-d95d2720f558';
