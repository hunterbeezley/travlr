-- ============================================================================
-- TEMPORARY: get_user_feed without strict auth check (for debugging)
-- This version will work even if auth.uid() returns NULL
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_feed CASCADE;

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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get authenticated user (but don't fail if NULL for now)
  v_user_id := auth.uid();

  -- Log for debugging
  RAISE NOTICE 'get_user_feed called, auth.uid() = %', v_user_id;

  -- If no auth, just return empty (for debugging)
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No authenticated user, returning empty feed';
    RETURN;
  END IF;

  -- Check if tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feed_activities'
  ) THEN
    RAISE NOTICE 'feed_activities table does not exist';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_follows'
  ) THEN
    RAISE NOTICE 'user_follows table does not exist';
    RETURN;
  END IF;

  -- Return feed activities
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
    RAISE NOTICE 'Error in get_user_feed: % %', SQLSTATE, SQLERRM;
    RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_feed TO anon, authenticated;

-- Test it
SELECT 'get_user_feed created (no auth check version)' as status;
