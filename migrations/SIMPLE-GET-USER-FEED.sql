-- ============================================================================
-- SIMPLE VERSION: get_user_feed with better error messages
-- This version has more detailed error logging
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_feed(INT, INT, TEXT);

CREATE FUNCTION get_user_feed(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() returned NULL';
  END IF;

  -- Log for debugging (will show in Supabase logs)
  RAISE NOTICE 'get_user_feed called by user: %, filter: %', v_user_id, p_filter;

  -- Check if feed_activities table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'feed_activities'
  ) THEN
    RAISE EXCEPTION 'Table feed_activities does not exist. Run Phase 1 migration first.';
  END IF;

  -- Check if user_follows table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_follows'
  ) THEN
    RAISE EXCEPTION 'Table user_follows does not exist. Run Phase 1 migration first.';
  END IF;

  -- Return query
  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    u.username,
    u.avatar_url,
    fa.activity_type,
    fa.target_type,
    fa.target_id,
    fa.metadata,
    fa.created_at
  FROM feed_activities fa
  JOIN users u ON u.id = fa.user_id
  WHERE
    CASE p_filter
      WHEN 'friends' THEN EXISTS(
        SELECT 1 FROM user_follows uf
        WHERE uf.follower_id = v_user_id
        AND uf.following_id = fa.user_id
      )
      WHEN 'self' THEN fa.user_id = v_user_id
      ELSE true
    END
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'get_user_feed error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test it
SELECT 'Simple get_user_feed created with detailed error messages' as status;
