-- ============================================================================
-- Phase 5: Polish - Analytics, Badges, Verification, Featured Collections
-- ============================================================================

-- Collection View Tracking
-- Track when users view collections for analytics
CREATE TABLE IF NOT EXISTS collection_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for anonymous views
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INT, -- How long they viewed
  source TEXT -- 'feed', 'explore', 'profile', 'direct', 'search'
);

CREATE INDEX idx_collection_views_collection ON collection_views(collection_id, viewed_at DESC);
CREATE INDEX idx_collection_views_user ON collection_views(user_id, viewed_at DESC);

-- User Badges
-- Gamification and achievement system
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'creator_starter', 'creator_bronze', 'creator_silver', 'creator_gold',
    'explorer_bronze', 'explorer_silver', 'explorer_gold',
    'social_butterfly', 'trendsetter', 'local_expert',
    'verified_creator', 'early_adopter', 'beta_tester'
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', -- Additional badge data
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);

-- User Verification
-- Track verified users (creators, local experts, etc.)
CREATE TABLE IF NOT EXISTS user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'creator', 'local_expert', 'business', 'staff'
  )),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES users(id), -- Admin who verified
  verification_notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_user_verification_user ON user_verification(user_id);
CREATE INDEX idx_user_verification_type ON user_verification(verification_type) WHERE is_active = true;

-- Featured Collections
-- Editorial/admin-curated featured collections
CREATE TABLE IF NOT EXISTS featured_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  featured_by UUID NOT NULL REFERENCES users(id), -- Admin who featured it
  featured_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  priority INT DEFAULT 0, -- Higher = shown first
  featured_reason TEXT, -- Why it's featured
  placement TEXT DEFAULT 'feed' CHECK (placement IN ('feed', 'explore', 'homepage', 'category')),
  category TEXT, -- If placement = 'category'
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_featured_collections_active ON featured_collections(is_active, priority DESC, featured_at DESC);
CREATE INDEX idx_featured_collections_placement ON featured_collections(placement, is_active) WHERE is_active = true;

-- Collection Analytics Summary
-- Pre-computed analytics for performance
CREATE TABLE IF NOT EXISTS collection_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE UNIQUE,
  total_views INT DEFAULT 0,
  total_likes INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  total_shares INT DEFAULT 0,
  total_comments INT DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  avg_view_duration_seconds NUMERIC,
  last_view_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_analytics_collection ON collection_analytics(collection_id);

-- ============================================================================
-- FUNCTIONS: Track Collection Views
-- ============================================================================

CREATE OR REPLACE FUNCTION track_collection_view(
  p_collection_id UUID,
  p_view_duration_seconds INT DEFAULT NULL,
  p_source TEXT DEFAULT 'direct'
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Record view
  INSERT INTO collection_views (collection_id, user_id, view_duration_seconds, source)
  VALUES (p_collection_id, v_user_id, p_view_duration_seconds, p_source);

  -- Update analytics summary (async in real app, but sync for simplicity)
  INSERT INTO collection_analytics (collection_id, total_views, unique_viewers, last_view_at)
  VALUES (
    p_collection_id,
    1,
    1,
    NOW()
  )
  ON CONFLICT (collection_id) DO UPDATE SET
    total_views = collection_analytics.total_views + 1,
    last_view_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: Get Collection Analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_collection_analytics(
  p_collection_id UUID,
  p_days INT DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_analytics JSONB;
  v_time_series JSONB;
  v_top_referrers JSONB;
BEGIN
  -- Get summary stats
  SELECT jsonb_build_object(
    'total_views', COALESCE(total_views, 0),
    'total_likes', COALESCE(total_likes, 0),
    'total_saves', COALESCE(total_saves, 0),
    'total_shares', COALESCE(total_shares, 0),
    'total_comments', COALESCE(total_comments, 0),
    'unique_viewers', COALESCE(unique_viewers, 0),
    'avg_view_duration_seconds', COALESCE(avg_view_duration_seconds, 0),
    'last_view_at', last_view_at
  )
  INTO v_analytics
  FROM collection_analytics
  WHERE collection_id = p_collection_id;

  -- Get daily time series for the period
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date::TEXT,
      'views', views,
      'unique_viewers', unique_viewers
    ) ORDER BY date DESC
  )
  INTO v_time_series
  FROM (
    SELECT
      DATE(viewed_at) as date,
      COUNT(*) as views,
      COUNT(DISTINCT user_id) as unique_viewers
    FROM collection_views
    WHERE collection_id = p_collection_id
      AND viewed_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(viewed_at)
  ) daily_stats;

  -- Get top referral sources
  SELECT jsonb_agg(
    jsonb_build_object(
      'source', source,
      'views', views
    ) ORDER BY views DESC
  )
  INTO v_top_referrers
  FROM (
    SELECT
      COALESCE(source, 'unknown') as source,
      COUNT(*) as views
    FROM collection_views
    WHERE collection_id = p_collection_id
      AND viewed_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY source
    ORDER BY views DESC
    LIMIT 10
  ) sources;

  -- Combine all analytics
  RETURN jsonb_build_object(
    'summary', COALESCE(v_analytics, '{}'::jsonb),
    'time_series', COALESCE(v_time_series, '[]'::jsonb),
    'top_sources', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: Get User Analytics (Creator Dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_analytics(p_days INT DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_summary JSONB;
  v_top_collections JSONB;
  v_engagement_trend JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Summary stats across all collections
  SELECT jsonb_build_object(
    'total_collections', COUNT(DISTINCT c.id),
    'total_pins', SUM((SELECT COUNT(*) FROM pins WHERE collection_id = c.id)),
    'total_views', COALESCE(SUM(ca.total_views), 0),
    'total_likes', COALESCE(SUM(ca.total_likes), 0),
    'total_saves', COALESCE(SUM(ca.total_saves), 0),
    'total_shares', COALESCE(SUM(ca.total_shares), 0),
    'total_comments', COALESCE(SUM(ca.total_comments), 0),
    'avg_engagement_rate', CASE
      WHEN SUM(ca.total_views) > 0
      THEN ROUND((SUM(ca.total_likes + ca.total_saves + ca.total_comments)::NUMERIC / SUM(ca.total_views)) * 100, 2)
      ELSE 0
    END
  )
  INTO v_summary
  FROM collections c
  LEFT JOIN collection_analytics ca ON ca.collection_id = c.id
  WHERE c.user_id = v_user_id
    AND c.is_public = true;

  -- Top performing collections
  SELECT jsonb_agg(
    jsonb_build_object(
      'collection_id', c.id,
      'collection_name', c.name,
      'views', COALESCE(ca.total_views, 0),
      'likes', COALESCE(ca.total_likes, 0),
      'saves', COALESCE(ca.total_saves, 0),
      'engagement_rate', CASE
        WHEN ca.total_views > 0
        THEN ROUND(((ca.total_likes + ca.total_saves + ca.total_comments)::NUMERIC / ca.total_views) * 100, 2)
        ELSE 0
      END
    ) ORDER BY COALESCE(ca.total_views, 0) DESC
  )
  INTO v_top_collections
  FROM collections c
  LEFT JOIN collection_analytics ca ON ca.collection_id = c.id
  WHERE c.user_id = v_user_id
    AND c.is_public = true
  LIMIT 10;

  -- Engagement trend over time
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date::TEXT,
      'views', views,
      'likes', likes,
      'saves', saves
    ) ORDER BY date DESC
  )
  INTO v_engagement_trend
  FROM (
    SELECT
      DATE(cv.viewed_at) as date,
      COUNT(DISTINCT cv.id) as views,
      COUNT(DISTINCT cl.id) as likes,
      COUNT(DISTINCT sc.id) as saves
    FROM collection_views cv
    LEFT JOIN collections c ON c.id = cv.collection_id
    LEFT JOIN collection_likes cl ON cl.collection_id = c.id AND DATE(cl.created_at) = DATE(cv.viewed_at)
    LEFT JOIN saved_collections sc ON sc.collection_id = c.id AND DATE(sc.created_at) = DATE(cv.viewed_at)
    WHERE c.user_id = v_user_id
      AND cv.viewed_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(cv.viewed_at)
  ) daily_engagement;

  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, '{}'::jsonb),
    'top_collections', COALESCE(v_top_collections, '[]'::jsonb),
    'engagement_trend', COALESCE(v_engagement_trend, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: Badge Management
-- ============================================================================

CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_type, metadata)
  VALUES (p_user_id, p_badge_type, p_metadata)
  ON CONFLICT (user_id, badge_type) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-award badges based on achievements
CREATE OR REPLACE FUNCTION check_badge_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_collection_count INT;
  v_like_count INT;
  v_save_count INT;
BEGIN
  -- Award creator badges based on collection count
  SELECT COUNT(*) INTO v_collection_count
  FROM collections
  WHERE user_id = NEW.user_id AND is_public = true;

  IF v_collection_count >= 1 THEN
    PERFORM award_badge(NEW.user_id, 'creator_starter');
  END IF;
  IF v_collection_count >= 5 THEN
    PERFORM award_badge(NEW.user_id, 'creator_bronze');
  END IF;
  IF v_collection_count >= 15 THEN
    PERFORM award_badge(NEW.user_id, 'creator_silver');
  END IF;
  IF v_collection_count >= 30 THEN
    PERFORM award_badge(NEW.user_id, 'creator_gold');
  END IF;

  -- Award explorer badges based on saved collections
  IF TG_TABLE_NAME = 'saved_collections' THEN
    SELECT COUNT(*) INTO v_save_count
    FROM saved_collections
    WHERE user_id = NEW.user_id;

    IF v_save_count >= 10 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_bronze');
    END IF;
    IF v_save_count >= 50 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_silver');
    END IF;
    IF v_save_count >= 100 THEN
      PERFORM award_badge(NEW.user_id, 'explorer_gold');
    END IF;
  END IF;

  -- Award social butterfly based on follows
  IF TG_TABLE_NAME = 'user_follows' THEN
    SELECT COUNT(*) INTO v_like_count
    FROM user_follows
    WHERE follower_id = NEW.follower_id;

    IF v_like_count >= 25 THEN
      PERFORM award_badge(NEW.follower_id, 'social_butterfly');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply badge triggers
DROP TRIGGER IF EXISTS trigger_check_badges_collections ON collections;
CREATE TRIGGER trigger_check_badges_collections
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION check_badge_achievements();

DROP TRIGGER IF EXISTS trigger_check_badges_saves ON saved_collections;
CREATE TRIGGER trigger_check_badges_saves
  AFTER INSERT ON saved_collections
  FOR EACH ROW
  EXECUTE FUNCTION check_badge_achievements();

DROP TRIGGER IF EXISTS trigger_check_badges_follows ON user_follows;
CREATE TRIGGER trigger_check_badges_follows
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION check_badge_achievements();

-- ============================================================================
-- FUNCTIONS: Featured Collections
-- ============================================================================

CREATE OR REPLACE FUNCTION get_featured_collections(
  p_placement TEXT DEFAULT 'feed',
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  collection_id UUID,
  collection_name TEXT,
  collection_description TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  pin_count BIGINT,
  featured_reason TEXT,
  featured_at TIMESTAMPTZ,
  sample_images TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id),
    fc.featured_reason,
    fc.featured_at,
    ARRAY(
      SELECT p.image_url
      FROM pins p
      WHERE p.collection_id = c.id
        AND p.image_url IS NOT NULL
      LIMIT 3
    )
  FROM featured_collections fc
  JOIN collections c ON c.id = fc.collection_id
  JOIN users u ON u.id = c.user_id
  WHERE fc.is_active = true
    AND fc.placement = p_placement
    AND (p_category IS NULL OR fc.category = p_category)
    AND (fc.expires_at IS NULL OR fc.expires_at > NOW())
  ORDER BY fc.priority DESC, fc.featured_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: Enhanced Search with Filters
-- ============================================================================

CREATE OR REPLACE FUNCTION search_collections_advanced(
  p_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_min_pins INT DEFAULT NULL,
  p_max_pins INT DEFAULT NULL,
  p_has_images BOOLEAN DEFAULT NULL,
  p_verified_only BOOLEAN DEFAULT false,
  p_min_likes INT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance', -- 'relevance', 'popular', 'recent', 'trending'
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
  is_verified BOOLEAN,
  pin_count BIGINT,
  likes_count INT,
  saves_count INT,
  created_at TIMESTAMPTZ,
  sample_images TEXT[],
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH collection_stats AS (
    SELECT
      c.id as cid,
      COUNT(DISTINCT p.id) as pcount,
      COUNT(DISTINCT CASE WHEN p.image_url IS NOT NULL THEN p.id END) as img_count,
      COALESCE(ca.total_likes, 0) as likes,
      COALESCE(ca.total_saves, 0) as saves,
      COALESCE(ca.total_views, 0) as views
    FROM collections c
    LEFT JOIN pins p ON p.collection_id = c.id
    LEFT JOIN collection_analytics ca ON ca.collection_id = c.id
    WHERE c.is_public = true
    GROUP BY c.id, ca.total_likes, ca.total_saves, ca.total_views
  )
  SELECT
    c.id,
    c.name,
    c.description,
    c.user_id,
    u.username,
    u.avatar_url,
    EXISTS(SELECT 1 FROM user_verification WHERE user_id = c.user_id AND is_active = true) as is_verified,
    cs.pcount,
    cs.likes::INT,
    cs.saves::INT,
    c.created_at,
    ARRAY(
      SELECT p.image_url
      FROM pins p
      WHERE p.collection_id = c.id
        AND p.image_url IS NOT NULL
      LIMIT 3
    ),
    CASE
      WHEN p_query IS NOT NULL THEN
        ts_rank(
          to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '')),
          plainto_tsquery('english', p_query)
        )
      ELSE 1.0
    END as relevance
  FROM collections c
  JOIN users u ON u.id = c.user_id
  JOIN collection_stats cs ON cs.cid = c.id
  WHERE c.is_public = true
    -- Search query filter
    AND (
      p_query IS NULL OR
      to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', p_query)
    )
    -- Category filter
    AND (p_category IS NULL OR c.category = p_category)
    -- City filter
    AND (p_city IS NULL OR EXISTS(
      SELECT 1 FROM pins p WHERE p.collection_id = c.id AND p.city = p_city
    ))
    -- Pin count filters
    AND (p_min_pins IS NULL OR cs.pcount >= p_min_pins)
    AND (p_max_pins IS NULL OR cs.pcount <= p_max_pins)
    -- Has images filter
    AND (p_has_images IS NULL OR (p_has_images = true AND cs.img_count > 0))
    -- Verified creators only
    AND (p_verified_only = false OR EXISTS(
      SELECT 1 FROM user_verification WHERE user_id = c.user_id AND is_active = true
    ))
    -- Minimum likes filter
    AND (p_min_likes IS NULL OR cs.likes >= p_min_likes)
  ORDER BY
    CASE
      WHEN p_sort_by = 'relevance' AND p_query IS NOT NULL THEN relevance
      WHEN p_sort_by = 'popular' THEN (cs.likes + cs.saves * 2)::NUMERIC
      WHEN p_sort_by = 'trending' THEN (
        cs.views::NUMERIC / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400)
      )
      ELSE 0
    END DESC,
    CASE WHEN p_sort_by = 'recent' THEN c.created_at ELSE NULL END DESC,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: User Profile with Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_profile_extended(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile JSONB;
  v_badges JSONB;
  v_stats JSONB;
  v_verification JSONB;
BEGIN
  -- Basic profile
  SELECT jsonb_build_object(
    'id', id,
    'username', username,
    'bio', bio,
    'avatar_url', avatar_url,
    'location', location,
    'website', website,
    'created_at', created_at
  )
  INTO v_profile
  FROM users
  WHERE id = p_user_id;

  -- Badges
  SELECT jsonb_agg(
    jsonb_build_object(
      'badge_type', badge_type,
      'earned_at', earned_at,
      'metadata', metadata
    ) ORDER BY earned_at DESC
  )
  INTO v_badges
  FROM user_badges
  WHERE user_id = p_user_id;

  -- Stats
  SELECT jsonb_build_object(
    'collections_count', (SELECT COUNT(*) FROM collections WHERE user_id = p_user_id AND is_public = true),
    'pins_count', (SELECT COUNT(*) FROM pins p JOIN collections c ON c.id = p.collection_id WHERE c.user_id = p_user_id),
    'followers_count', (SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id),
    'following_count', (SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id),
    'total_likes', (SELECT COALESCE(SUM(ca.total_likes), 0) FROM collection_analytics ca JOIN collections c ON c.id = ca.collection_id WHERE c.user_id = p_user_id),
    'total_saves', (SELECT COALESCE(SUM(ca.total_saves), 0) FROM collection_analytics ca JOIN collections c ON c.id = ca.collection_id WHERE c.user_id = p_user_id),
    'total_views', (SELECT COALESCE(SUM(ca.total_views), 0) FROM collection_analytics ca JOIN collections c ON c.id = ca.collection_id WHERE c.user_id = p_user_id)
  )
  INTO v_stats;

  -- Verification status
  SELECT jsonb_build_object(
    'is_verified', is_active,
    'verification_type', verification_type,
    'verified_at', verified_at
  )
  INTO v_verification
  FROM user_verification
  WHERE user_id = p_user_id AND is_active = true;

  RETURN jsonb_build_object(
    'profile', COALESCE(v_profile, '{}'::jsonb),
    'badges', COALESCE(v_badges, '[]'::jsonb),
    'stats', COALESCE(v_stats, '{}'::jsonb),
    'verification', COALESCE(v_verification, 'null'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Collection views - Anyone can track views
ALTER TABLE collection_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can track collection views"
  ON collection_views FOR INSERT
  WITH CHECK (true);

-- Users can view their own view history
CREATE POLICY "Users can view their own view history"
  ON collection_views FOR SELECT
  USING (auth.uid() = user_id);

-- Collection owners can see all views of their collections
CREATE POLICY "Owners can see collection views"
  ON collection_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_views.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- Badges - Public read, system write
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are publicly readable"
  ON user_badges FOR SELECT
  USING (true);

-- Verification - Public read
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification status is publicly readable"
  ON user_verification FOR SELECT
  USING (is_active = true);

-- Featured collections - Public read
ALTER TABLE featured_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Featured collections are publicly readable"
  ON featured_collections FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Analytics - Owner read only
ALTER TABLE collection_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view collection analytics"
  ON collection_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_analytics.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Update existing get_collection_stats to include analytics
-- ============================================================================

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
