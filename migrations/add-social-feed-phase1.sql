-- Phase 1: Basic Feed - Social Features Migration
-- Issue #28: Add social feed for discovery and friend activity

-- ============================================================================
-- USER FOLLOWS (Following/Followers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Can't follow yourself
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id, created_at DESC);

-- RLS Policies for user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view follows
CREATE POLICY "Anyone can view follows"
  ON user_follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- COLLECTION LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

CREATE INDEX idx_collection_likes_collection ON collection_likes(collection_id);
CREATE INDEX idx_collection_likes_user ON collection_likes(user_id, created_at DESC);

-- RLS Policies for collection_likes
ALTER TABLE collection_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes on public collections
CREATE POLICY "Anyone can view likes"
  ON collection_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_likes.collection_id
        AND collections.is_public = true
    )
  );

-- Users can like collections
CREATE POLICY "Users can like collections"
  ON collection_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike collections
CREATE POLICY "Users can unlike collections"
  ON collection_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SAVED COLLECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT, -- Optional organization (for future feature)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

CREATE INDEX idx_saved_collections_user ON saved_collections(user_id, created_at DESC);
CREATE INDEX idx_saved_collections_collection ON saved_collections(collection_id);

-- RLS Policies for saved_collections
ALTER TABLE saved_collections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own saves
CREATE POLICY "Users can view their own saves"
  ON saved_collections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save collections
CREATE POLICY "Users can save collections"
  ON saved_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave collections
CREATE POLICY "Users can unsave collections"
  ON saved_collections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FEED ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS feed_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'collection_created',
    'collection_updated',
    'pin_added',
    'collection_liked',
    'collection_saved',
    'user_followed',
    'comment_added'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('collection', 'pin', 'user', 'comment')),
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional activity data (pin count, collection name, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_activities_user_created ON feed_activities(user_id, created_at DESC);
CREATE INDEX idx_feed_activities_created ON feed_activities(created_at DESC);
CREATE INDEX idx_feed_activities_type ON feed_activities(activity_type, created_at DESC);

-- RLS Policies for feed_activities
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities from:
-- 1. People they follow
-- 2. Their own activities
-- 3. Activities on public collections
CREATE POLICY "Users can view feed activities"
  ON feed_activities FOR SELECT
  USING (
    auth.uid() = user_id -- Own activities
    OR
    EXISTS ( -- Following user's activities
      SELECT 1 FROM user_follows
      WHERE user_follows.follower_id = auth.uid()
        AND user_follows.following_id = feed_activities.user_id
    )
    OR
    ( -- Public collection activities
      activity_type IN ('collection_created', 'collection_updated', 'pin_added', 'collection_liked')
      AND EXISTS (
        SELECT 1 FROM collections
        WHERE collections.id = feed_activities.target_id
          AND collections.is_public = true
      )
    )
  );

-- System can insert activities (done via triggers or API)
CREATE POLICY "System can insert activities"
  ON feed_activities FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS FOR ACTIVITY TRACKING
-- ============================================================================

-- Function to create activity when collection is created
CREATE OR REPLACE FUNCTION create_collection_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_activities (user_id, activity_type, target_type, target_id, metadata)
  VALUES (
    NEW.user_id,
    'collection_created',
    'collection',
    NEW.id,
    jsonb_build_object(
      'collection_name', NEW.name,
      'is_public', NEW.is_public
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for collection creation
DROP TRIGGER IF EXISTS trigger_collection_created ON collections;
CREATE TRIGGER trigger_collection_created
  AFTER INSERT ON collections
  FOR EACH ROW
  WHEN (NEW.is_public = true) -- Only track public collections
  EXECUTE FUNCTION create_collection_activity();

-- Function to create activity when pin is added
CREATE OR REPLACE FUNCTION create_pin_activity()
RETURNS TRIGGER AS $$
DECLARE
  collection_owner_id UUID;
  collection_name TEXT;
  is_public BOOLEAN;
BEGIN
  -- Get collection details
  SELECT user_id, name, is_public INTO collection_owner_id, collection_name, is_public
  FROM collections
  WHERE id = NEW.collection_id;

  -- Only create activity for public collections
  IF is_public THEN
    INSERT INTO feed_activities (user_id, activity_type, target_type, target_id, metadata)
    VALUES (
      collection_owner_id,
      'pin_added',
      'collection',
      NEW.collection_id,
      jsonb_build_object(
        'collection_name', collection_name,
        'pin_name', NEW.name,
        'pin_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for pin addition
DROP TRIGGER IF EXISTS trigger_pin_added ON pins;
CREATE TRIGGER trigger_pin_added
  AFTER INSERT ON pins
  FOR EACH ROW
  EXECUTE FUNCTION create_pin_activity();

-- ============================================================================
-- RPC FUNCTIONS FOR SOCIAL FEATURES
-- ============================================================================

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS follow_user(UUID);
DROP FUNCTION IF EXISTS unfollow_user(UUID);
DROP FUNCTION IF EXISTS like_collection(UUID);
DROP FUNCTION IF EXISTS unlike_collection(UUID);
DROP FUNCTION IF EXISTS save_collection(UUID, TEXT);
DROP FUNCTION IF EXISTS unsave_collection(UUID);
DROP FUNCTION IF EXISTS get_user_feed(INT, INT, TEXT);
DROP FUNCTION IF EXISTS get_collection_stats(UUID);

-- Follow a user
CREATE OR REPLACE FUNCTION follow_user(p_following_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF v_user_id = p_following_id THEN
    RETURN jsonb_build_object('error', 'Cannot follow yourself');
  END IF;

  -- Insert follow relationship
  INSERT INTO user_follows (follower_id, following_id)
  VALUES (v_user_id, p_following_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Create feed activity
  INSERT INTO feed_activities (user_id, activity_type, target_type, target_id)
  VALUES (v_user_id, 'user_followed', 'user', p_following_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(p_following_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  DELETE FROM user_follows
  WHERE follower_id = v_user_id
    AND following_id = p_following_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Like a collection
CREATE OR REPLACE FUNCTION like_collection(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_collection_owner UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if collection exists and is public
  SELECT user_id INTO v_collection_owner
  FROM collections
  WHERE id = p_collection_id AND is_public = true;

  IF v_collection_owner IS NULL THEN
    RETURN jsonb_build_object('error', 'Collection not found or not public');
  END IF;

  -- Insert like
  INSERT INTO collection_likes (collection_id, user_id)
  VALUES (p_collection_id, v_user_id)
  ON CONFLICT (collection_id, user_id) DO NOTHING;

  -- Create feed activity
  INSERT INTO feed_activities (user_id, activity_type, target_type, target_id)
  VALUES (v_user_id, 'collection_liked', 'collection', p_collection_id);

  -- Create notification for collection owner (if not liking own collection)
  IF v_collection_owner != v_user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_collection_owner,
      'collection_liked',
      'Collection Liked',
      (SELECT username || ' liked your collection' FROM users WHERE id = v_user_id),
      '/collections/' || p_collection_id,
      jsonb_build_object('liker_id', v_user_id, 'collection_id', p_collection_id)
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unlike a collection
CREATE OR REPLACE FUNCTION unlike_collection(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  DELETE FROM collection_likes
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save a collection
CREATE OR REPLACE FUNCTION save_collection(p_collection_id UUID, p_folder TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if collection exists and is public
  IF NOT EXISTS (
    SELECT 1 FROM collections
    WHERE id = p_collection_id AND is_public = true
  ) THEN
    RETURN jsonb_build_object('error', 'Collection not found or not public');
  END IF;

  -- Insert save
  INSERT INTO saved_collections (collection_id, user_id, folder)
  VALUES (p_collection_id, v_user_id, p_folder)
  ON CONFLICT (collection_id, user_id) DO UPDATE SET folder = EXCLUDED.folder;

  -- Create feed activity
  INSERT INTO feed_activities (user_id, activity_type, target_type, target_id)
  VALUES (v_user_id, 'collection_saved', 'collection', p_collection_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unsave a collection
CREATE OR REPLACE FUNCTION unsave_collection(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  DELETE FROM saved_collections
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's feed (friend activity)
CREATE OR REPLACE FUNCTION get_user_feed(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_filter TEXT DEFAULT 'all' -- 'all', 'friends', 'self'
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
    CASE
      WHEN p_filter = 'self' THEN
        fa.user_id = v_user_id
      WHEN p_filter = 'friends' THEN
        fa.user_id IN (
          SELECT following_id FROM user_follows
          WHERE follower_id = v_user_id
        )
      ELSE -- 'all'
        (
          fa.user_id = v_user_id
          OR
          fa.user_id IN (
            SELECT following_id FROM user_follows
            WHERE follower_id = v_user_id
          )
        )
    END
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get collection engagement stats
CREATE OR REPLACE FUNCTION get_collection_stats(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_likes_count INT;
  v_saves_count INT;
  v_comments_count INT;
  v_user_liked BOOLEAN;
  v_user_saved BOOLEAN;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get counts
  SELECT COUNT(*) INTO v_likes_count
  FROM collection_likes
  WHERE collection_id = p_collection_id;

  SELECT COUNT(*) INTO v_saves_count
  FROM saved_collections
  WHERE collection_id = p_collection_id;

  SELECT COUNT(*) INTO v_comments_count
  FROM collection_comments
  WHERE collection_id = p_collection_id;

  -- Check if current user has liked/saved
  v_user_liked := false;
  v_user_saved := false;

  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM collection_likes
      WHERE collection_id = p_collection_id AND user_id = v_user_id
    ) INTO v_user_liked;

    SELECT EXISTS (
      SELECT 1 FROM saved_collections
      WHERE collection_id = p_collection_id AND user_id = v_user_id
    ) INTO v_user_saved;
  END IF;

  RETURN jsonb_build_object(
    'likes_count', v_likes_count,
    'saves_count', v_saves_count,
    'comments_count', v_comments_count,
    'user_liked', v_user_liked,
    'user_saved', v_user_saved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
