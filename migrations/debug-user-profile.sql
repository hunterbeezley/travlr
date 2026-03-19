-- ============================================================================
-- DEBUG: Check if your user profile exists
-- ============================================================================

-- 1. Check if you're authenticated
SELECT auth.uid() as your_user_id;

-- 2. Check if your profile exists in the users table
SELECT
  id,
  email,
  username,
  profile_image,
  created_at
FROM users
WHERE id = auth.uid();

-- 3. Check what RLS policies exist on the users table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 4. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 5. Try a test update (this won't actually change anything)
-- If this returns 0 rows, RLS is blocking the update
UPDATE users
SET updated_at = updated_at
WHERE id = auth.uid()
RETURNING id, username;
