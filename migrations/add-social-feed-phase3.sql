-- Phase 3: Engagement - Notifications, Sharing, Organization
-- Issue #28: Add social feed for discovery and friend activity

-- ============================================================================
-- COLLECTION SHARES (Track external sharing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_method TEXT NOT NULL CHECK (share_method IN ('link', 'twitter', 'facebook', 'email', 'whatsapp')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_shares_collection ON collection_shares(collection_id);
CREATE INDEX idx_collection_shares_user ON collection_shares(user_id, created_at DESC);

-- RLS Policies for collection_shares
ALTER TABLE collection_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares on public collections
CREATE POLICY "Users can view shares on public collections"
  ON collection_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_shares.collection_id
        AND collections.is_public = true
    )
  );

-- Users can track their own shares
CREATE POLICY "Users can track their own shares"
  ON collection_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ENHANCED NOTIFICATIONS FOR SOCIAL FEATURES
-- ============================================================================

-- Notification types already exist in notifications table, but let's add trigger
-- for follower notifications

-- Function to notify user when they get a new follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username TEXT;
BEGIN
  -- Get follower's username
  SELECT username INTO v_follower_username
  FROM users
  WHERE id = NEW.follower_id;

  -- Create notification for the user being followed
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    v_follower_username || ' started following you',
    '/profile/' || NEW.follower_id,
    jsonb_build_object('follower_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new followers
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON user_follows;
CREATE TRIGGER trigger_notify_new_follower
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- Function to notify collection owner when saved
CREATE OR REPLACE FUNCTION notify_collection_saved()
RETURNS TRIGGER AS $$
DECLARE
  v_saver_username TEXT;
  v_collection_name TEXT;
  v_collection_owner UUID;
BEGIN
  -- Get collection details
  SELECT user_id, name INTO v_collection_owner, v_collection_name
  FROM collections
  WHERE id = NEW.collection_id;

  -- Don't notify if user saved their own collection
  IF v_collection_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get saver's username
  SELECT username INTO v_saver_username
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    v_collection_owner,
    'collection_saved',
    'Collection Saved',
    v_saver_username || ' saved your collection "' || v_collection_name || '"',
    '/collections/' || NEW.collection_id,
    jsonb_build_object('saver_id', NEW.user_id, 'collection_id', NEW.collection_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for collection saves
DROP TRIGGER IF EXISTS trigger_notify_collection_saved ON saved_collections;
CREATE TRIGGER trigger_notify_collection_saved
  AFTER INSERT ON saved_collections
  FOR EACH ROW
  EXECUTE FUNCTION notify_collection_saved();

-- ============================================================================
-- COLLECTION FOLDERS (Organization for saved collections)
-- ============================================================================

-- Update saved_collections to better support folders
-- (folder field already exists, just add some helper functions)

-- Function to get user's saved collections organized by folder
CREATE OR REPLACE FUNCTION get_saved_collections_by_folder(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  folder TEXT,
  collections JSONB
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
    COALESCE(sc.folder, 'Unsorted') AS folder,
    jsonb_agg(
      jsonb_build_object(
        'collection_id', c.id,
        'collection_name', c.name,
        'collection_description', c.description,
        'user_id', c.user_id,
        'username', u.username,
        'avatar_url', u.avatar_url,
        'saved_at', sc.created_at,
        'pin_count', (SELECT COUNT(*) FROM pins WHERE collection_id = c.id)
      )
      ORDER BY sc.created_at DESC
    ) AS collections
  FROM saved_collections sc
  JOIN collections c ON c.id = sc.collection_id
  JOIN users u ON u.id = c.user_id
  WHERE sc.user_id = v_user_id
    AND c.is_public = true
  GROUP BY sc.folder
  ORDER BY folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rename/organize folder
CREATE OR REPLACE FUNCTION organize_saved_collection(
  p_collection_id UUID,
  p_folder TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Update folder
  UPDATE saved_collections
  SET folder = p_folder
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Collection not saved or not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all folders for a user
CREATE OR REPLACE FUNCTION get_user_folders()
RETURNS TABLE (
  folder TEXT,
  collection_count BIGINT
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
    COALESCE(sc.folder, 'Unsorted') AS folder,
    COUNT(*) AS collection_count
  FROM saved_collections sc
  WHERE sc.user_id = v_user_id
  GROUP BY sc.folder
  ORDER BY collection_count DESC, folder;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SHARE COLLECTION FUNCTIONS
-- ============================================================================

-- Function to track collection share
CREATE OR REPLACE FUNCTION track_collection_share(
  p_collection_id UUID,
  p_share_method TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if collection is public
  IF NOT EXISTS (
    SELECT 1 FROM collections
    WHERE id = p_collection_id AND is_public = true
  ) THEN
    RETURN jsonb_build_object('error', 'Collection not found or not public');
  END IF;

  -- Track the share
  INSERT INTO collection_shares (collection_id, user_id, share_method)
  VALUES (p_collection_id, v_user_id, p_share_method);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get share count for a collection
CREATE OR REPLACE FUNCTION get_collection_share_count(p_collection_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM collection_shares
    WHERE collection_id = p_collection_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_collection_stats to include shares
DROP FUNCTION IF EXISTS get_collection_stats(UUID);
CREATE OR REPLACE FUNCTION get_collection_stats(p_collection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_likes_count INT;
  v_saves_count INT;
  v_comments_count INT;
  v_shares_count INT;
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

  SELECT COUNT(*) INTO v_shares_count
  FROM collection_shares
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
    'shares_count', v_shares_count,
    'user_liked', v_user_liked,
    'user_saved', v_user_saved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ACTIVITY SUMMARY FOR USER PROFILE
-- ============================================================================

-- Function to get user's social stats
CREATE OR REPLACE FUNCTION get_user_social_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_followers_count INT;
  v_following_count INT;
  v_collections_count INT;
  v_total_likes_received INT;
  v_total_saves_received INT;
  v_user_is_following BOOLEAN;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  -- Get follower count
  SELECT COUNT(*) INTO v_followers_count
  FROM user_follows
  WHERE following_id = p_user_id;

  -- Get following count
  SELECT COUNT(*) INTO v_following_count
  FROM user_follows
  WHERE follower_id = p_user_id;

  -- Get collections count
  SELECT COUNT(*) INTO v_collections_count
  FROM collections
  WHERE user_id = p_user_id AND is_public = true;

  -- Get total likes received on all collections
  SELECT COUNT(*) INTO v_total_likes_received
  FROM collection_likes cl
  WHERE cl.collection_id IN (
    SELECT id FROM collections WHERE user_id = p_user_id
  );

  -- Get total saves received on all collections
  SELECT COUNT(*) INTO v_total_saves_received
  FROM saved_collections sc
  WHERE sc.collection_id IN (
    SELECT id FROM collections WHERE user_id = p_user_id
  );

  -- Check if current user is following this user
  v_user_is_following := false;
  IF v_current_user_id IS NOT NULL AND v_current_user_id != p_user_id THEN
    SELECT EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = v_current_user_id AND following_id = p_user_id
    ) INTO v_user_is_following;
  END IF;

  RETURN jsonb_build_object(
    'followers_count', v_followers_count,
    'following_count', v_following_count,
    'collections_count', v_collections_count,
    'total_likes_received', v_total_likes_received,
    'total_saves_received', v_total_saves_received,
    'is_following', v_user_is_following
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION notify_new_follower TO authenticated;
GRANT EXECUTE ON FUNCTION notify_collection_saved TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_collections_by_folder TO authenticated;
GRANT EXECUTE ON FUNCTION organize_saved_collection TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_folders TO authenticated;
GRANT EXECUTE ON FUNCTION track_collection_share TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_share_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_social_stats TO authenticated;
