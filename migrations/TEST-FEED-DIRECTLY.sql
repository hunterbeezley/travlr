-- ============================================================================
-- TEST: Call get_user_feed directly in Supabase
-- This will show the actual error message
-- ============================================================================

-- 1. Check if function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_feed';
-- Expected: 1 row

-- 2. Check if required tables exist
SELECT
  table_name,
  CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'feed_activities' AND column_name = 'id') THEN 'Has columns'
    ELSE 'Empty or missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('feed_activities', 'user_follows', 'users')
ORDER BY table_name;
-- Expected: 3 rows (feed_activities, user_follows, users)

-- 3. Check if feed_activities has any data
SELECT
  COUNT(*) as total_activities,
  COUNT(DISTINCT user_id) as unique_users
FROM feed_activities;
-- Expected: 0 activities if fresh install

-- 4. Try calling the function (THIS WILL SHOW THE ACTUAL ERROR)
-- Note: This will only work if you're authenticated in Supabase dashboard
SELECT * FROM get_user_feed(20, 0, 'all');

-- 5. If step 4 fails with auth error, try this simpler version
-- This bypasses auth check for testing
DO $$
DECLARE
  v_result RECORD;
BEGIN
  FOR v_result IN
    SELECT
      fa.id,
      fa.user_id,
      u.username,
      fa.activity_type,
      fa.target_type,
      fa.target_id,
      fa.created_at
    FROM feed_activities fa
    JOIN users u ON u.id = fa.user_id
    ORDER BY fa.created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE 'Activity: % by % at %', v_result.activity_type, v_result.username, v_result.created_at;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE 'No activities found - this is normal for fresh install';
  END IF;
END $$;
