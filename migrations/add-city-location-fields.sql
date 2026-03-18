-- Migration: Add city, state, country fields to pins table for location-based discovery
-- Part of Issue #29 - City-based discovery feed
--
-- This migration adds granular location fields to pins to enable city-based filtering
-- These fields should be populated from Google Places API address components

-- Add location fields to pins table
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS city TEXT NULL,
ADD COLUMN IF NOT EXISTS state TEXT NULL,
ADD COLUMN IF NOT EXISTS country TEXT NULL,
ADD COLUMN IF NOT EXISTS country_code TEXT NULL;

-- Create indexes for efficient city-based queries
CREATE INDEX IF NOT EXISTS idx_pins_city ON pins(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pins_state ON pins(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pins_country ON pins(country) WHERE country IS NOT NULL;

-- Add comments documenting the new fields
COMMENT ON COLUMN pins.city IS 'City name extracted from Google Places address (e.g., San Francisco, Tokyo)';
COMMENT ON COLUMN pins.state IS 'State/Province extracted from Google Places address (e.g., CA, Tokyo)';
COMMENT ON COLUMN pins.country IS 'Country name extracted from Google Places address (e.g., United States, Japan)';
COMMENT ON COLUMN pins.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, JP)';

-- =============================================================================
-- Function: Get primary city for a collection
-- =============================================================================
-- Returns the most common city among a collection's pins
-- Used to determine which city a collection belongs to for discovery feed
CREATE OR REPLACE FUNCTION get_collection_primary_city(p_collection_id UUID)
RETURNS TABLE (
  city TEXT,
  state TEXT,
  country TEXT,
  country_code TEXT,
  pin_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.city,
    p.state,
    p.country,
    p.country_code,
    COUNT(*) as pin_count
  FROM pins p
  WHERE p.collection_id = p_collection_id
    AND p.city IS NOT NULL
  GROUP BY p.city, p.state, p.country, p.country_code
  ORDER BY COUNT(*) DESC, p.city ASC
  LIMIT 1;
END;
$$;

-- =============================================================================
-- Function: Get collections by city for discovery feed
-- =============================================================================
-- Returns public collections that have pins in a specific city
-- Includes vote counts, pin counts, and creator information
-- Supports various sorting options
CREATE OR REPLACE FUNCTION get_collections_by_city(
  p_city TEXT,
  p_sort_by TEXT DEFAULT 'recent', -- Options: 'recent', 'popular', 'top_rated'
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_friends_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  username TEXT,
  user_profile_image TEXT,
  pin_count BIGINT,
  first_pin_image TEXT,
  color TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER,
  city TEXT,
  state TEXT,
  country TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH collection_cities AS (
    -- Get primary city for each collection
    SELECT
      p.collection_id,
      p.city,
      p.state,
      p.country,
      COUNT(*) as city_pin_count,
      ROW_NUMBER() OVER (PARTITION BY p.collection_id ORDER BY COUNT(*) DESC, p.city ASC) as rn
    FROM pins p
    WHERE p.city IS NOT NULL
    GROUP BY p.collection_id, p.city, p.state, p.country
  ),
  collection_primary_city AS (
    SELECT
      collection_id,
      city,
      state,
      country
    FROM collection_cities
    WHERE rn = 1
  )
  SELECT
    c.id,
    c.title,
    c.description,
    c.is_public,
    c.created_at,
    c.updated_at,
    c.user_id,
    u.username,
    u.profile_image as user_profile_image,
    COUNT(DISTINCT p.id) as pin_count,
    (
      SELECT pi.image_url
      FROM pins p2
      LEFT JOIN pin_images pi ON p2.id = pi.pin_id
      WHERE p2.collection_id = c.id
      ORDER BY p2.created_at DESC, pi.upload_order ASC
      LIMIT 1
    ) as first_pin_image,
    c.color,
    COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0)::INTEGER AS upvotes,
    COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0)::INTEGER AS downvotes,
    (COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0) -
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score,
    cpc.city,
    cpc.state,
    cpc.country
  FROM collections c
  INNER JOIN users u ON c.user_id = u.id
  INNER JOIN collection_primary_city cpc ON cpc.collection_id = c.id
  LEFT JOIN pins p ON p.collection_id = c.id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE c.is_public = true
    AND LOWER(cpc.city) = LOWER(p_city)
    AND (
      NOT p_friends_only
      OR c.user_id IN (
        SELECT following_id
        FROM follows
        WHERE follower_id = auth.uid()
      )
    )
  GROUP BY c.id, u.username, u.profile_image, cpc.city, cpc.state, cpc.country
  ORDER BY
    CASE
      WHEN p_sort_by = 'recent' THEN c.created_at
      ELSE NULL
    END DESC,
    CASE
      WHEN p_sort_by = 'popular' THEN COUNT(DISTINCT p.id)
      ELSE NULL
    END DESC,
    CASE
      WHEN p_sort_by = 'top_rated' THEN (
        COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0) -
        COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0)
      )
      ELSE NULL
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================================================
-- Function: Get all cities with public collections
-- =============================================================================
-- Returns a list of cities that have at least one public collection
-- Used for city selector dropdown
CREATE OR REPLACE FUNCTION get_cities_with_collections()
RETURNS TABLE (
  city TEXT,
  state TEXT,
  country TEXT,
  country_code TEXT,
  collection_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH collection_cities AS (
    SELECT
      p.city,
      p.state,
      p.country,
      p.country_code,
      p.collection_id,
      COUNT(*) as city_pin_count,
      ROW_NUMBER() OVER (PARTITION BY p.collection_id ORDER BY COUNT(*) DESC) as rn
    FROM pins p
    INNER JOIN collections c ON c.id = p.collection_id
    WHERE p.city IS NOT NULL
      AND c.is_public = true
    GROUP BY p.city, p.state, p.country, p.country_code, p.collection_id
  )
  SELECT
    cc.city,
    cc.state,
    cc.country,
    cc.country_code,
    COUNT(DISTINCT cc.collection_id) as collection_count
  FROM collection_cities cc
  WHERE cc.rn = 1
  GROUP BY cc.city, cc.state, cc.country, cc.country_code
  ORDER BY collection_count DESC, cc.city ASC;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION get_collection_primary_city(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collections_by_city(TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cities_with_collections() TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON FUNCTION get_collection_primary_city IS
'Returns the most common city among a collections pins';

COMMENT ON FUNCTION get_collections_by_city IS
'Gets public collections filtered by city with sorting options';

COMMENT ON FUNCTION get_cities_with_collections IS
'Returns all cities that have public collections with collection counts';
