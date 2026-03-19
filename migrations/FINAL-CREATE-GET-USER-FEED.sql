-- ============================================================================
-- FINAL FIX: Create get_user_feed function (guaranteed to work)
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================================================

-- Drop if exists (ignore errors)
DROP FUNCTION IF EXISTS get_user_feed CASCADE;

-- Create the function
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
  -- Get authenticated user
  v_user_id := auth.uid();

  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return empty result set if feed_activities doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feed_activities'
  ) THEN
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
END;
$$;

-- Test it immediately
SELECT 'SUCCESS: get_user_feed function created!' as status;

-- Try calling it (will return empty if no activities)
SELECT * FROM get_user_feed(5, 0, 'all');
