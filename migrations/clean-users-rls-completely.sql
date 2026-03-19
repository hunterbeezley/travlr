-- ============================================================================
-- CLEAN SLATE: Remove ALL users table RLS policies and recreate properly
-- ============================================================================

-- Disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop EVERY possible policy name (including ones we might have missed)
DROP POLICY IF EXISTS "Anyone can read profiles" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Users insert own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Verify all policies are gone
SELECT COUNT(*) as remaining_policies
FROM pg_policies
WHERE tablename = 'users';
-- Should return 0

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create ONLY 3 policies - one per operation
CREATE POLICY "select_own_profile"
  ON users FOR SELECT
  USING (true);  -- Anyone can read profiles (needed for social features)

CREATE POLICY "update_own_profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);  -- Users can only update their own row

CREATE POLICY "insert_own_profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);  -- Users can only insert their own row

-- Verify we have exactly 3 policies
SELECT
  policyname,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN 'Should have: USING (true)'
    WHEN 'UPDATE' THEN 'Should have: USING (auth.uid() = id)'
    WHEN 'INSERT' THEN 'Should have: WITH CHECK (auth.uid() = id)'
  END as expected_condition
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Test update (should return your row if it works)
UPDATE users
SET updated_at = NOW()
WHERE id = auth.uid()
RETURNING id, username, email;
