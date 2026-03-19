-- Phase 2: Discovery - Trending, Nearby, Search
-- Issue #28: Add social feed for discovery and friend activity

-- ============================================================================
-- DISCOVERY HELPER FUNCTIONS
-- ============================================================================

-- Get trending collections (based on recent activity)
CREATE OR REPLACE FUNCTION get_trending_collections(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_days INT DEFAULT 7 -- Look at activity from last N days
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
  comments_count BIGINT,
  trending_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_activity AS (
    -- Recent likes (weighted higher)
    SELECT
      cl.collection_id,
      COUNT(*) * 3 AS score
    FROM collection_likes cl
    WHERE cl.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY cl.collection_id

    UNION ALL

    -- Recent saves (weighted higher)
    SELECT
      sc.collection_id,
      COUNT(*) * 2 AS score
    FROM saved_collections sc
    WHERE sc.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY sc.collection_id

    UNION ALL

    -- Recent comments
    SELECT
      cc.collection_id,
      COUNT(*) AS score
    FROM collection_comments cc
    WHERE cc.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY cc.collection_id
  ),
  collection_scores AS (
    SELECT
      ra.collection_id,
      SUM(ra.score) AS total_score
    FROM recent_activity ra
    GROUP BY ra.collection_id
  )
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    (SELECT COUNT(*) FROM collection_comments WHERE collection_id = c.id) AS comments_count,
    COALESCE(cs.total_score, 0) AS trending_score,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN collection_scores cs ON cs.collection_id = c.id
  WHERE c.is_public = true
    AND cs.total_score > 0 -- Only collections with recent activity
  ORDER BY trending_score DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get nearby collections (based on user's location)
CREATE OR REPLACE FUNCTION get_nearby_collections(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 50, -- Radius in kilometers
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
  distance_km NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH collection_locations AS (
    -- Get average location of pins in each collection
    SELECT
      p.collection_id,
      AVG(p.latitude) AS avg_lat,
      AVG(p.longitude) AS avg_lng,
      COUNT(*) AS pin_count
    FROM pins p
    WHERE p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
    GROUP BY p.collection_id
    HAVING COUNT(*) > 0
  ),
  nearby AS (
    SELECT
      cl.collection_id,
      cl.pin_count,
      -- Haversine formula for distance calculation
      (
        6371 * acos(
          cos(radians(p_lat)) *
          cos(radians(cl.avg_lat)) *
          cos(radians(cl.avg_lng) - radians(p_lng)) +
          sin(radians(p_lat)) *
          sin(radians(cl.avg_lat))
        )
      ) AS distance_km
    FROM collection_locations cl
    WHERE (
      6371 * acos(
        cos(radians(p_lat)) *
        cos(radians(cl.avg_lat)) *
        cos(radians(cl.avg_lng) - radians(p_lng)) +
        sin(radians(p_lat)) *
        sin(radians(cl.avg_lat))
      )
    ) <= p_radius_km
  )
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    n.pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    n.distance_km,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  JOIN nearby n ON n.collection_id = c.id
  WHERE c.is_public = true
  ORDER BY n.distance_km ASC, likes_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get collections by city
CREATE OR REPLACE FUNCTION get_collections_by_city(
  p_city TEXT,
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
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH city_collections AS (
    -- Find collections that have pins in the specified city
    SELECT DISTINCT
      p.collection_id,
      COUNT(*) OVER (PARTITION BY p.collection_id) AS pin_count
    FROM pins p
    WHERE p.city ILIKE '%' || p_city || '%'
      OR p.address ILIKE '%' || p_city || '%'
  )
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    cc.pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  JOIN city_collections cc ON cc.collection_id = c.id
  WHERE c.is_public = true
  ORDER BY likes_count DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get popular cities (cities with most collections)
CREATE OR REPLACE FUNCTION get_popular_cities(
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  city TEXT,
  collection_count BIGINT,
  pin_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.city,
    COUNT(DISTINCT p.collection_id) AS collection_count,
    COUNT(*) AS pin_count
  FROM pins p
  JOIN collections c ON c.id = p.collection_id
  WHERE p.city IS NOT NULL
    AND p.city != ''
    AND c.is_public = true
  GROUP BY p.city
  ORDER BY collection_count DESC, pin_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search collections by name or description
CREATE OR REPLACE FUNCTION search_collections(
  p_query TEXT,
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
  created_at TIMESTAMPTZ,
  relevance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    c.created_at,
    -- Simple relevance scoring
    CASE
      WHEN c.name ILIKE p_query THEN 100
      WHEN c.name ILIKE p_query || '%' THEN 90
      WHEN c.name ILIKE '%' || p_query || '%' THEN 70
      WHEN c.description ILIKE '%' || p_query || '%' THEN 50
      ELSE 0
    END AS relevance
  FROM collections c
  JOIN users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND (
      c.name ILIKE '%' || p_query || '%'
      OR c.description ILIKE '%' || p_query || '%'
    )
  ORDER BY relevance DESC, likes_count DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get collections by category (based on collection color/theme or pin types)
CREATE OR REPLACE FUNCTION get_collections_by_category(
  p_category TEXT, -- For now, just search in name/description
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
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND (
      c.name ILIKE '%' || p_category || '%'
      OR c.description ILIKE '%' || p_category || '%'
    )
  ORDER BY likes_count DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get featured collections (most popular overall)
CREATE OR REPLACE FUNCTION get_featured_collections(
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
  likes_count BIGINT,
  saves_count BIGINT,
  comments_count BIGINT,
  created_at TIMESTAMPTZ,
  popularity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    (SELECT COUNT(*) FROM collection_comments WHERE collection_id = c.id) AS comments_count,
    c.created_at,
    -- Popularity score: likes * 3 + saves * 2 + comments
    (
      (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) * 3 +
      (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) * 2 +
      (SELECT COUNT(*) FROM collection_comments WHERE collection_id = c.id)
    ) AS popularity_score
  FROM collections c
  JOIN users u ON u.id = c.user_id
  WHERE c.is_public = true
    AND (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) >= 3 -- At least 3 pins
  ORDER BY popularity_score DESC, c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get personalized recommendations (based on user's saved/liked collections)
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
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
  recommendation_score NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    -- If not authenticated, return trending collections
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
      tc.trending_score AS recommendation_score,
      tc.created_at
    FROM get_trending_collections(p_limit, p_offset, 30) tc;
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_interests AS (
    -- Get collections user has interacted with
    SELECT collection_id FROM collection_likes WHERE user_id = v_user_id
    UNION
    SELECT collection_id FROM saved_collections WHERE user_id = v_user_id
  ),
  similar_users AS (
    -- Find users with similar tastes
    SELECT DISTINCT
      cl.user_id,
      COUNT(*) AS overlap
    FROM collection_likes cl
    WHERE cl.collection_id IN (SELECT collection_id FROM user_interests)
      AND cl.user_id != v_user_id
    GROUP BY cl.user_id
    ORDER BY overlap DESC
    LIMIT 20
  ),
  recommended AS (
    -- Get collections liked by similar users that current user hasn't interacted with
    SELECT
      cl.collection_id,
      COUNT(*) AS recommendation_score
    FROM collection_likes cl
    WHERE cl.user_id IN (SELECT user_id FROM similar_users)
      AND cl.collection_id NOT IN (SELECT collection_id FROM user_interests)
      AND cl.collection_id NOT IN (
        SELECT id FROM collections WHERE user_id = v_user_id
      )
    GROUP BY cl.collection_id
  )
  SELECT
    c.id AS collection_id,
    c.name AS collection_name,
    c.description AS collection_description,
    c.user_id,
    u.username,
    u.avatar_url,
    (SELECT COUNT(*) FROM pins WHERE collection_id = c.id) AS pin_count,
    (SELECT COUNT(*) FROM collection_likes WHERE collection_id = c.id) AS likes_count,
    (SELECT COUNT(*) FROM saved_collections WHERE collection_id = c.id) AS saves_count,
    r.recommendation_score::NUMERIC,
    c.created_at
  FROM collections c
  JOIN users u ON u.id = c.user_id
  JOIN recommended r ON r.collection_id = c.id
  WHERE c.is_public = true
  ORDER BY r.recommendation_score DESC, likes_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_trending_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_collections_by_city TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_cities TO authenticated;
GRANT EXECUTE ON FUNCTION search_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_collections_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_collections TO authenticated;
GRANT EXECUTE ON FUNCTION get_personalized_recommendations TO authenticated;
