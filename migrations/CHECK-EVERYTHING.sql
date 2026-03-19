-- ============================================================================
-- COMPREHENSIVE CHECK: What exists and what doesn't
-- ============================================================================

-- 1. Check if tables exist
SELECT 'Tables Check' as check_type, table_name, 'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_follows',
    'collection_likes',
    'saved_collections',
    'feed_activities',
    'collection_shares',
    'user_interests',
    'notification_preferences',
    'user_badges',
    'user_verification',
    'featured_collections',
    'collection_views',
    'collection_analytics'
  )
ORDER BY table_name;

-- 2. Check if functions exist (simpler query)
SELECT 'Functions Check' as check_type, proname as function_name, 'EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'get_user_feed',
    'get_for_you_feed',
    'get_collection_stats',
    'follow_user',
    'like_collection',
    'save_collection'
  )
ORDER BY proname;

-- 3. Check current user authentication
SELECT
  'Auth Check' as check_type,
  CASE
    WHEN auth.uid() IS NOT NULL THEN 'AUTHENTICATED'
    ELSE 'NOT AUTHENTICATED'
  END as status,
  auth.uid() as user_id;

-- 4. If feed_activities exists, check if it has any data
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feed_activities') THEN
    RAISE NOTICE 'feed_activities table exists';
    RAISE NOTICE 'Row count: %', (SELECT COUNT(*) FROM feed_activities);
  ELSE
    RAISE NOTICE 'feed_activities table DOES NOT EXIST';
  END IF;
END $$;
