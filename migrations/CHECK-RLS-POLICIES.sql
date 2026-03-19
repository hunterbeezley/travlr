-- ============================================================================
-- CHECK: Row Level Security Policies
-- See if RLS is blocking queries
-- ============================================================================

-- 1. Check if RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('feed_activities', 'user_follows', 'collection_likes', 'saved_collections')
ORDER BY tablename;

-- 2. List all policies on feed_activities
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'feed_activities';

-- 3. Quick fix: If RLS is blocking, temporarily disable it for testing
-- UNCOMMENT THESE LINES TO DISABLE RLS (FOR TESTING ONLY):
-- ALTER TABLE feed_activities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_follows DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_likes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_collections DISABLE ROW LEVEL SECURITY;

-- 4. Check current user (should show your user ID)
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- If this returns NULL for current_user_id, you're not authenticated properly
