-- ============================================================================
-- FIX: User Feedback Bugs - Complete Database Setup
-- This fixes issues #127, #128, #129, #132
-- ============================================================================
-- Run this in your Supabase SQL Editor to fix all feed-related bugs

-- ============================================================================
-- PART 1: Create Missing Tables
-- ============================================================================

-- Create collection_comments table (fixes #127: comment posting)
CREATE TABLE IF NOT EXISTS collection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT comment_text_length CHECK (char_length(comment_text) > 0 AND char_length(comment_text) <= 1000)
);

-- Create collection_likes table (fixes #128: liking collections)
CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- Create saved_collections table (fixes #129: saving collections)
CREATE TABLE IF NOT EXISTS saved_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- Create collection_shares table (for tracking shares)
CREATE TABLE IF NOT EXISTS collection_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collection_analytics table (for tracking views)
CREATE TABLE IF NOT EXISTS collection_analytics (
  collection_id UUID PRIMARY KEY REFERENCES collections(id) ON DELETE CASCADE,
  total_views INT DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feed_activities table (fixes #132: followed users in feed)
CREATE TABLE IF NOT EXISTS feed_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_comments_collection ON collection_comments(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_comments_user ON collection_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_collection ON collection_likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user ON collection_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_collections_user ON saved_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_collections_collection ON saved_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_feed_activities_user ON feed_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_activities_created ON feed_activities(created_at DESC);

-- ============================================================================
-- PART 2: Enable Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE collection_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments on public collections" ON collection_comments;
DROP POLICY IF EXISTS "Users can create comments" ON collection_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON collection_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON collection_comments;
DROP POLICY IF EXISTS "Users can view all likes" ON collection_likes;
DROP POLICY IF EXISTS "Users can view all saves" ON saved_collections;
DROP POLICY IF EXISTS "Users can view feed activities" ON feed_activities;

-- Collection Comments RLS
CREATE POLICY "Users can view comments on public collections"
ON collection_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_comments.collection_id
    AND (c.is_public = true OR c.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create comments"
ON collection_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON collection_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON collection_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Collection Likes RLS (allow reading all likes for counts)
CREATE POLICY "Users can view all likes"
ON collection_likes FOR SELECT
TO authenticated
USING (true);

-- Saved Collections RLS (allow reading all saves for counts)
CREATE POLICY "Users can view all saves"
ON saved_collections FOR SELECT
TO authenticated
USING (true);

-- Feed Activities RLS
CREATE POLICY "Users can view feed activities"
ON feed_activities FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- PART 3: Drop and Recreate All Feed Functions
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_feed(INT, INT, TEXT);
DROP FUNCTION IF EXISTS get_for_you_feed(INT, INT);
DROP FUNCTION IF EXISTS get_collection_stats(UUID);
DROP FUNCTION IF EXISTS follow_user(UUID);
DROP FUNCTION IF EXISTS unfollow_user(UUID);
DROP FUNCTION IF EXISTS like_collection(UUID);
DROP FUNCTION IF EXISTS unlike_collection(UUID);
DROP FUNCTION IF EXISTS save_collection(UUID, TEXT);
DROP FUNCTION IF EXISTS unsave_collection(UUID);

-- 1. get_user_feed (Activity tab - fixes #132)
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    u.username,
    u.profile_image as avatar_url,
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
CREATE FUNCTION get_for_you_feed(
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
    c.title,
    c.description,
    c.user_id,
    u.username,
    u.profile_image as avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id),
    1.0::NUMERIC as score,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND c.user_id != v_user_id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. get_collection_stats (used by feed cards - fixes like/save counts)
CREATE FUNCTION get_collection_stats(p_collection_id UUID)
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
CREATE FUNCTION follow_user(p_following_id UUID)
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
CREATE FUNCTION unfollow_user(p_following_id UUID)
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

-- 6. like_collection (fixes #128)
CREATE FUNCTION like_collection(p_collection_id UUID)
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

-- 7. unlike_collection (fixes #128)
CREATE FUNCTION unlike_collection(p_collection_id UUID)
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

-- 8. save_collection (fixes #129)
CREATE FUNCTION save_collection(
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

-- 9. unsave_collection (fixes #129)
CREATE FUNCTION unsave_collection(p_collection_id UUID)
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

-- ============================================================================
-- PART 4: Grant Execute Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_feed(INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_for_you_feed(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION follow_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION like_collection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unlike_collection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_collection(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unsave_collection(UUID) TO authenticated;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

SELECT 'All user feedback bugs fixed! 🎉' as status;
SELECT 'Tables created: collection_comments, collection_likes, saved_collections, collection_shares, collection_analytics, feed_activities' as tables;
SELECT 'Functions created: like_collection, unlike_collection, save_collection, unsave_collection, get_user_feed, get_collection_stats' as functions;
SELECT 'Bugs fixed: #127 (comments), #128 (likes), #129 (saves), #132 (followed users feed)' as fixed_issues;
SELECT 'Next step: Refresh your app to test the fixes!' as next_action;
