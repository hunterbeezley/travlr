-- Phase 4: Personalization - AI-like Recommendations, Following Suggestions
-- Issue #28: Add social feed for discovery and friend activity

-- ============================================================================
-- USER INTERESTS & PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('category', 'location', 'user')),
  interest_value TEXT NOT NULL,
  score NUMERIC DEFAULT 1.0, -- Higher score = stronger interest
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_type, interest_value)
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_interests_type ON user_interests(interest_type, score DESC);

-- RLS Policies for user_interests
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own interests
CREATE POLICY "Users can view their own interests"
  ON user_interests FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update interests
CREATE POLICY "System can manage interests"
  ON user_interests FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'never')),
  notify_on_like BOOLEAN DEFAULT true,
  notify_on_save BOOLEAN DEFAULT true,
  notify_on_comment BOOLEAN DEFAULT true,
  notify_on_follow BOOLEAN DEFAULT true,
  notify_on_mention BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- INTEREST TRACKING FUNCTIONS
-- ============================================================================

-- Function to update user interests based on activity
CREATE OR REPLACE FUNCTION update_user_interests()
RETURNS TRIGGER AS $$
DECLARE
  v_interest_type TEXT;
  v_interest_value TEXT;
  v_collection_data RECORD;
BEGIN
  -- Determine interest type based on trigger
  IF TG_TABLE_NAME = 'collection_likes' THEN
    -- Get collection info
    SELECT c.name, p.city
    INTO v_collection_data
    FROM collections c
    LEFT JOIN LATERAL (
      SELECT city FROM pins WHERE collection_id = c.id AND city IS NOT NULL LIMIT 1
    ) p ON true
    WHERE c.id = NEW.collection_id;

    -- Extract category from collection name (simple keyword matching)
    IF v_collection_data.name ILIKE '%restaurant%' OR v_collection_data.name ILIKE '%food%' THEN
      v_interest_value := 'restaurant';
    ELSIF v_collection_data.name ILIKE '%coffee%' OR v_collection_data.name ILIKE '%cafe%' THEN
      v_interest_value := 'coffee';
    ELSIF v_collection_data.name ILIKE '%travel%' OR v_collection_data.name ILIKE '%trip%' THEN
      v_interest_value := 'travel';
    ELSIF v_collection_data.name ILIKE '%bar%' OR v_collection_data.name ILIKE '%nightlife%' THEN
      v_interest_value := 'bar';
    ELSIF v_collection_data.name ILIKE '%museum%' OR v_collection_data.name ILIKE '%art%' THEN
      v_interest_value := 'museum';
    ELSIF v_collection_data.name ILIKE '%park%' OR v_collection_data.name ILIKE '%outdoor%' THEN
      v_interest_value := 'park';
    ELSIF v_collection_data.name ILIKE '%shop%' OR v_collection_data.name ILIKE '%shopping%' THEN
      v_interest_value := 'shopping';
    ELSIF v_collection_data.name ILIKE '%beach%' THEN
      v_interest_value := 'beach';
    ELSIF v_collection_data.name ILIKE '%hike%' OR v_collection_data.name ILIKE '%hiking%' THEN
      v_interest_value := 'hike';
    ELSIF v_collection_data.name ILIKE '%hotel%' THEN
      v_interest_value := 'hotel';
    END IF;

    -- Track category interest
    IF v_interest_value IS NOT NULL THEN
      INSERT INTO user_interests (user_id, interest_type, interest_value, score, last_updated)
      VALUES (NEW.user_id, 'category', v_interest_value, 1.0, NOW())
      ON CONFLICT (user_id, interest_type, interest_value)
      DO UPDATE SET
        score = user_interests.score + 0.5,
        last_updated = NOW();
    END IF;

    -- Track location interest
    IF v_collection_data.city IS NOT NULL THEN
      INSERT INTO user_interests (user_id, interest_type, interest_value, score, last_updated)
      VALUES (NEW.user_id, 'location', v_collection_data.city, 1.0, NOW())
      ON CONFLICT (user_id, interest_type, interest_value)
      DO UPDATE SET
        score = user_interests.score + 0.3,
        last_updated = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to track interests on likes
DROP TRIGGER IF EXISTS trigger_track_interests_on_like ON collection_likes;
CREATE TRIGGER trigger_track_interests_on_like
  AFTER INSERT ON collection_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_interests();

-- ============================================================================
-- FOLLOWING SUGGESTIONS
-- ============================================================================

-- Function to get following suggestions
CREATE OR REPLACE FUNCTION get_following_suggestions(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  reason TEXT,
  mutual_friends INT,
  common_interests INT,
  relevance_score NUMERIC
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH current_following AS (
    -- Users already following
    SELECT following_id FROM user_follows WHERE follower_id = v_user_id
  ),
  user_collections_liked AS (
    -- Collections current user has liked
    SELECT collection_id FROM collection_likes WHERE user_id = v_user_id
  ),
  similar_users AS (
    -- Users who liked similar collections
    SELECT
      cl.user_id,
      COUNT(*) AS common_likes,
      'Similar taste in collections' AS reason
    FROM collection_likes cl
    WHERE cl.collection_id IN (SELECT collection_id FROM user_collections_liked)
      AND cl.user_id != v_user_id
      AND cl.user_id NOT IN (SELECT following_id FROM current_following)
    GROUP BY cl.user_id
  ),
  friends_of_friends AS (
    -- Friends of people you follow
    SELECT
      uf2.following_id AS user_id,
      COUNT(*) AS mutual_count,
      'Friend of ' || COUNT(*) || ' people you follow' AS reason
    FROM user_follows uf1
    JOIN user_follows uf2 ON uf2.follower_id = uf1.following_id
    WHERE uf1.follower_id = v_user_id
      AND uf2.following_id != v_user_id
      AND uf2.following_id NOT IN (SELECT following_id FROM current_following)
    GROUP BY uf2.following_id
  ),
  popular_users AS (
    -- Popular users (many followers)
    SELECT
      uf.following_id AS user_id,
      COUNT(*) AS follower_count,
      'Popular creator' AS reason
    FROM user_follows uf
    WHERE uf.following_id != v_user_id
      AND uf.following_id NOT IN (SELECT following_id FROM current_following)
    GROUP BY uf.following_id
    HAVING COUNT(*) > 5
  ),
  common_interests_users AS (
    -- Users with similar interests
    SELECT
      ui2.user_id,
      COUNT(*) AS common_interest_count,
      'Similar interests' AS reason
    FROM user_interests ui1
    JOIN user_interests ui2 ON
      ui2.interest_type = ui1.interest_type
      AND ui2.interest_value = ui1.interest_value
      AND ui2.user_id != v_user_id
    WHERE ui1.user_id = v_user_id
      AND ui2.user_id NOT IN (SELECT following_id FROM current_following)
    GROUP BY ui2.user_id
  ),
  all_suggestions AS (
    SELECT
      su.user_id,
      su.reason,
      COALESCE(su.common_likes, 0) AS common_interests,
      COALESCE(fof.mutual_count, 0) AS mutual_friends,
      (
        COALESCE(su.common_likes, 0) * 3 +
        COALESCE(fof.mutual_count, 0) * 2 +
        COALESCE(ciu.common_interest_count, 0) * 1.5 +
        COALESCE(pu.follower_count, 0) * 0.1
      ) AS relevance_score
    FROM similar_users su
    FULL OUTER JOIN friends_of_friends fof USING (user_id)
    FULL OUTER JOIN popular_users pu USING (user_id)
    FULL OUTER JOIN common_interests_users ciu USING (user_id)
    WHERE COALESCE(su.user_id, fof.user_id, pu.user_id, ciu.user_id) IS NOT NULL
  )
  SELECT
    u.id AS user_id,
    u.username,
    u.avatar_url,
    COALESCE(
      CASE
        WHEN asug.mutual_friends > 0 THEN asug.reason
        WHEN asug.common_interests > 0 THEN asug.reason
        ELSE asug.reason
      END,
      'Suggested for you'
    ) AS reason,
    asug.mutual_friends::INT,
    asug.common_interests::INT,
    asug.relevance_score
  FROM all_suggestions asug
  JOIN users u ON u.id = COALESCE(asug.user_id, asug.user_id)
  ORDER BY asug.relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SMART "FOR YOU" FEED
-- ============================================================================

-- Enhanced personalized feed with interest scoring
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
  likes_count BIGINT,
  saves_count BIGINT,
  recommendation_reason TEXT,
  relevance_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    -- Not authenticated, return trending
    RETURN QUERY
    SELECT
      tc.collection_id,
      tc.collection_name,
      tc.collection_description,
      tc.user_id,
      tc.username,
      tc.avatar_url,
      tc.pin_count,
      tc.likes_count,
      tc.saves_count,
      'Trending now' AS recommendation_reason,
      tc.trending_score AS relevance_score,
      tc.created_at
    FROM get_trending_collections(p_limit, p_offset, 7) tc;
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_interactions AS (
    -- Collections user has interacted with
    SELECT collection_id FROM collection_likes WHERE user_id = v_user_id
    UNION
    SELECT collection_id FROM saved_collections WHERE user_id = v_user_id
    UNION
    SELECT collection_id FROM collection_comments WHERE user_id = v_user_id
  ),
  user_category_interests AS (
    -- User's category interests with scores
    SELECT interest_value, score
    FROM user_interests
    WHERE user_id = v_user_id AND interest_type = 'category'
  ),
  user_location_interests AS (
    -- User's location interests
    SELECT interest_value, score
    FROM user_interests
    WHERE user_id = v_user_id AND interest_type = 'location'
  ),
  following_users AS (
    -- Users being followed
    SELECT following_id FROM user_follows WHERE follower_id = v_user_id
  ),
  scored_collections AS (
    SELECT
      c.id,
      c.name,
      c.description,
      c.user_id,
      c.created_at,
      -- Base score from engagement
      (
        (SELECT COUNT(*)::NUMERIC FROM collection_likes WHERE collection_id = c.id) * 2 +
        (SELECT COUNT(*)::NUMERIC FROM saved_collections WHERE collection_id = c.id) * 3 +
        (SELECT COUNT(*)::NUMERIC FROM collection_comments WHERE collection_id = c.id)
      ) AS engagement_score,
      -- Interest match score
      (
        SELECT COALESCE(SUM(ui.score), 0)
        FROM user_category_interests ui
        WHERE c.name ILIKE '%' || ui.interest_value || '%'
          OR c.description ILIKE '%' || ui.interest_value || '%'
      ) AS interest_match_score,
      -- Location match score
      (
        SELECT COALESCE(AVG(ul.score), 0)
        FROM pins p
        JOIN user_location_interests ul ON p.city ILIKE '%' || ul.interest_value || '%'
        WHERE p.collection_id = c.id
      ) AS location_match_score,
      -- Following boost
      CASE WHEN c.user_id IN (SELECT following_id FROM following_users) THEN 5.0 ELSE 0.0 END AS following_boost,
      -- Recency boost (newer = better)
      CASE
        WHEN c.created_at > NOW() - INTERVAL '7 days' THEN 2.0
        WHEN c.created_at > NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.5
      END AS recency_boost,
      -- Recommendation reason
      CASE
        WHEN c.user_id IN (SELECT following_id FROM following_users) THEN 'From people you follow'
        WHEN EXISTS (
          SELECT 1 FROM user_category_interests ui
          WHERE c.name ILIKE '%' || ui.interest_value || '%'
        ) THEN 'Based on your interests'
        WHEN EXISTS (
          SELECT 1 FROM pins p
          JOIN user_location_interests ul ON p.city ILIKE '%' || ul.interest_value || '%'
          WHERE p.collection_id = c.id
        ) THEN 'Places you might like'
        ELSE 'Recommended for you'
      END AS reason
    FROM collections c
    WHERE c.is_public = true
      AND c.id NOT IN (SELECT collection_id FROM user_interactions)
      AND c.user_id != v_user_id
  )
  SELECT
    sc.id AS collection_id,
    sc.name AS collection_name,
    sc.description AS collection_description,
    sc.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = sc.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = sc.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = sc.id) AS saves_count,
    sc.reason AS recommendation_reason,
    (
      sc.engagement_score * 1.0 +
      sc.interest_match_score * 3.0 +
      sc.location_match_score * 2.0 +
      sc.following_boost +
      sc.recency_boost
    ) AS relevance_score,
    sc.created_at
  FROM scored_collections sc
  JOIN users u ON u.id = sc.user_id
  ORDER BY relevance_score DESC, sc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION PREFERENCES FUNCTIONS
-- ============================================================================

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_prefs RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get or create preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = v_user_id;

  RETURN to_jsonb(v_prefs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_email_notifications BOOLEAN DEFAULT NULL,
  p_push_notifications BOOLEAN DEFAULT NULL,
  p_digest_frequency TEXT DEFAULT NULL,
  p_notify_on_like BOOLEAN DEFAULT NULL,
  p_notify_on_save BOOLEAN DEFAULT NULL,
  p_notify_on_comment BOOLEAN DEFAULT NULL,
  p_notify_on_follow BOOLEAN DEFAULT NULL,
  p_notify_on_mention BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Update preferences (only non-null values)
  UPDATE notification_preferences
  SET
    email_notifications = COALESCE(p_email_notifications, email_notifications),
    push_notifications = COALESCE(p_push_notifications, push_notifications),
    digest_frequency = COALESCE(p_digest_frequency, digest_frequency),
    notify_on_like = COALESCE(p_notify_on_like, notify_on_like),
    notify_on_save = COALESCE(p_notify_on_save, notify_on_save),
    notify_on_comment = COALESCE(p_notify_on_comment, notify_on_comment),
    notify_on_follow = COALESCE(p_notify_on_follow, notify_on_follow),
    notify_on_mention = COALESCE(p_notify_on_mention, notify_on_mention),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_user_interests TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_for_you_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences TO authenticated;
