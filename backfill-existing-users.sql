-- Backfill: Create user records for any existing auth users
-- Run this in your Supabase SQL Editor to fix existing users

INSERT INTO public.users (id, email, created_at)
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE public.users.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify the results
SELECT
  COUNT(*) as total_users_created
FROM public.users;
