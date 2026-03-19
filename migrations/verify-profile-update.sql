-- ============================================================================
-- VERIFY: Check if profile updates are working
-- ============================================================================

-- 1. Check current policies (should be exactly 3)
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 2. Check your current profile data
SELECT
  id,
  email,
  username,
  profile_image,
  updated_at,
  created_at
FROM users
WHERE id = auth.uid();

-- 3. Try updating profile_image directly
UPDATE users
SET profile_image = 'test-url-' || NOW()::text,
    updated_at = NOW()
WHERE id = auth.uid()
RETURNING id, email, username, profile_image, updated_at;

-- 4. Verify the update stuck
SELECT
  id,
  email,
  username,
  profile_image,
  updated_at
FROM users
WHERE id = auth.uid();

-- 5. Check if the column exists and has the right type
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('profile_image', 'updated_at', 'id', 'email', 'username');
