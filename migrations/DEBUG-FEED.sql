-- ============================================================================
-- DEBUG: Check Feed Page Functions
-- ============================================================================

-- 1. Check if get_user_feed exists
SELECT
  routine_name,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_feed';
-- Expected: 1 row with routine_name = 'get_user_feed'

-- 2. Check if get_for_you_feed exists
SELECT
  routine_name,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_for_you_feed';
-- Expected: 1 row with routine_name = 'get_for_you_feed'

-- 3. Check if required tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('feed_activities', 'user_follows', 'collections', 'users')
ORDER BY table_name;
-- Expected: 4 rows (all tables)

-- 4. Test calling get_user_feed directly (comment out if function doesn't exist)
-- This will show the actual error
SELECT * FROM get_user_feed(
  p_limit := 20,
  p_offset := 0,
  p_filter := 'all'
);
