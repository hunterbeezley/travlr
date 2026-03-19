-- ============================================================================
-- CHECK AND CREATE: Verify your user profile exists
-- ============================================================================

-- 1. Check if you're authenticated
SELECT auth.uid() as your_auth_id;

-- 2. Check if your profile row exists in users table
SELECT
  id,
  email,
  username,
  profile_image,
  created_at,
  updated_at
FROM users
WHERE id = auth.uid();

-- 3. If the above returns no rows, create the profile row
-- (Only run this if step 2 returned 0 rows)
INSERT INTO users (id, email, created_at, updated_at)
SELECT
  auth.uid(),
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()
)
RETURNING id, email, username;

-- 4. Verify the user now exists
SELECT
  id,
  email,
  username,
  profile_image,
  created_at
FROM users
WHERE id = auth.uid();

-- 5. Try the update again
UPDATE users
SET profile_image = 'test-image-url'
WHERE id = auth.uid()
RETURNING id, email, username, profile_image;
