-- ============================================================================
-- VERIFY: Check if get_user_feed function exists and is callable
-- ============================================================================

-- 1. Check if function exists
SELECT
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_feed';

-- If no results, the function doesn't exist!

-- 2. Check the function signature (parameters)
SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'get_user_feed'
ORDER BY ordinal_position;

-- 3. Try to call it (replace with your actual user ID if needed)
-- This will show the actual error if it fails
SELECT * FROM get_user_feed(20, 0, 'all') LIMIT 5;

-- 4. Check current auth context
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role,
  current_user as postgres_user;

-- 5. Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('feed_activities', 'user_follows', 'users')
ORDER BY table_name;
