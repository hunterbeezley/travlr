-- ============================================================================
-- FIX: Create all feed-related functions manually
-- Run this to ensure all feed page functions exist
-- ============================================================================

-- 1. get_user_feed (Activity tab)
CREATE OR REPLACE FUNCTION get_user_feed(
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. get_for_you_feed (For You tab)
CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  collection_id UUID,
  collection_name TEXT,
  collection_description TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  pin_count BIGINT,
  personalization_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id),
    1.0::NUMERIC as score, -- Simple scoring for now
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND c.user_id != v_user_id -- Don't show own collections
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. get_collection_stats (used by feed cards)
CREATE OR REPLACE FUNCTION get_collection_stats(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_likes_count INT;
  v_saves_count INT;
  v_comments_count INT;
  v_shares_count INT;
  v_views_count INT;
  v_user_liked BOOLEAN;
  v_user_saved BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  -- Get counts
  SELECT COUNT(*) INTO v_likes_count FROM collection_likes WHERE collection_id = p_collection_id;
  SELECT COUNT(*) INTO v_saves_count FROM saved_collections WHERE collection_id = p_collection_id;
  SELECT COUNT(*) INTO v_comments_count FROM collection_comments WHERE collection_id = p_collection_id;
  SELECT COALESCE(COUNT(*), 0) INTO v_shares_count FROM collection_shares WHERE collection_id = p_collection_id;
  SELECT COALESCE(total_views, 0) INTO v_views_count FROM collection_analytics WHERE collection_id = p_collection_id;

  -- Check user state
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM collection_likes WHERE collection_id = p_collection_id AND user_id = v_user_id) INTO v_user_liked;
    SELECT EXISTS(SELECT 1 FROM saved_collections WHERE collection_id = p_collection_id AND user_id = v_user_id) INTO v_user_saved;
  ELSE
    v_user_liked := false;
    v_user_saved := false;
  END IF;

  RETURN jsonb_build_object(
    'likes_count', v_likes_count,
    'saves_count', v_saves_count,
    'comments_count', v_comments_count,
    'shares_count', v_shares_count,
    'views_count', v_views_count,
    'user_liked', v_user_liked,
    'user_saved', v_user_saved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. follow_user
CREATE OR REPLACE FUNCTION follow_user(p_following_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_follows (follower_id, following_id)
  VALUES (v_user_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. unfollow_user
CREATE OR REPLACE FUNCTION unfollow_user(p_following_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM user_follows
  WHERE follower_id = v_user_id
    AND following_id = p_following_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. like_collection
CREATE OR REPLACE FUNCTION like_collection(p_collection_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO collection_likes (collection_id, user_id)
  VALUES (p_collection_id, v_user_id)
  ON CONFLICT (collection_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. unlike_collection
CREATE OR REPLACE FUNCTION unlike_collection(p_collection_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM collection_likes
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. save_collection
CREATE OR REPLACE FUNCTION save_collection(
  p_collection_id UUID,
  p_folder TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO saved_collections (collection_id, user_id, folder)
  VALUES (p_collection_id, v_user_id, p_folder)
  ON CONFLICT (collection_id, user_id) DO UPDATE
  SET folder = p_folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. unsave_collection
CREATE OR REPLACE FUNCTION unsave_collection(p_collection_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM saved_collections
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'All feed functions created successfully!' as status;
SELECT 'Refresh your app and the feed page should work now.' as next_step;
