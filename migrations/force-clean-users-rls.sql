-- ============================================================================
-- FORCE CLEAN: Aggressively remove duplicate RLS policies
-- ============================================================================

-- Step 1: Disable RLS completely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Force drop using DO block to iterate through all policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Verify ALL policies are gone (should be 0)
SELECT COUNT(*) as remaining_policies FROM pg_policies WHERE tablename = 'users';

-- Step 4: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Wait a moment, then create ONLY 3 new policies with unique names
CREATE POLICY "users_select_policy_v2"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "users_update_policy_v2"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "users_insert_policy_v2"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 6: Final verification (should show exactly 3 policies)
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Step 7: Test the update
UPDATE users
SET updated_at = NOW()
WHERE id = auth.uid()
RETURNING id, email, username;
