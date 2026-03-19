-- ============================================================================
-- SIMPLE FIX: Users table RLS policies
-- ============================================================================
-- Drop ALL existing policies and create simple, permissive ones
-- ============================================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Simple policy: Anyone can read any profile
CREATE POLICY "Anyone can read profiles"
  ON users
  FOR SELECT
  USING (true);

-- Simple policy: Users can update their own profile
CREATE POLICY "Users update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Simple policy: Users can insert their own profile
CREATE POLICY "Users insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TEST THE POLICIES
-- ============================================================================
-- This should show all 3 policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- Check if your user can update their profile
-- Replace 'your-user-id' with your actual user ID from auth.users
SELECT
  id,
  username,
  CASE
    WHEN id = auth.uid() THEN 'This is you - UPDATE should work'
    ELSE 'Different user'
  END as test
FROM users
WHERE id = auth.uid();
