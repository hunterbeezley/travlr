-- Migration: Viewport-bounded Discover feed for /map
-- Part of Issue #147 - Make /map Discover tab a viewport-driven timeline
--
-- Replaces the Discover tab's one-shot "fetch up to 500 public collections
-- globally" query with a bounds-scoped RPC that can be re-run as the user
-- pans/zooms the map, modeled on the existing get_collections_by_city /
-- get_discover_collections functions (same join shape, geo bounds instead
-- of a city-name match).

-- Index needed for the bounds filter below - none existed on pins(lat, lng)
-- prior to this migration.
CREATE INDEX IF NOT EXISTS idx_pins_lat_lng ON pins(latitude, longitude);

-- =============================================================================
-- Function: Get public collections with a pin inside the given map bounds
-- =============================================================================
-- Returns list-view fields only (no nested pin arrays - the detail modal
-- fetches a collection's pins on demand when opened, via
-- DatabaseService.getCollectionPins). Excludes the viewer's own collections,
-- matching get_discover_collections' existing behavior. Works for
-- unauthenticated viewers too (auth.uid() falls back to a nil UUID).
CREATE OR REPLACE FUNCTION get_discover_collections_in_bounds(
  min_lat NUMERIC,
  max_lat NUMERIC,
  min_lng NUMERIC,
  max_lng NUMERIC,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  user_id UUID,
  username TEXT,
  user_profile_image TEXT,
  pin_count BIGINT,
  first_pin_image TEXT,
  color TEXT,
  net_score INTEGER,
  created_at TIMESTAMPTZ,
  rep_latitude DOUBLE PRECISION,
  rep_longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH representative_pin AS (
    -- One in-bounds pin per collection (earliest-created), used both to
    -- confirm the collection actually has a pin in view and to place its
    -- marker - avoids letting one stray pin pull an unrelated, far-flung
    -- collection into the current viewport.
    SELECT DISTINCT ON (p.collection_id)
      p.collection_id,
      p.latitude AS rep_latitude,
      p.longitude AS rep_longitude
    FROM pins p
    WHERE p.latitude BETWEEN min_lat AND max_lat
      AND p.longitude BETWEEN min_lng AND max_lng
    ORDER BY p.collection_id, p.created_at ASC
  )
  SELECT
    c.id,
    c.title,
    c.description,
    c.user_id,
    u.username,
    u.profile_image AS user_profile_image,
    COUNT(DISTINCT p.id) AS pin_count,
    (
      SELECT pi.image_url
      FROM pins p2
      LEFT JOIN pin_images pi ON p2.id = pi.pin_id
      WHERE p2.collection_id = c.id
      ORDER BY p2.created_at DESC, pi.upload_order ASC
      LIMIT 1
    ) AS first_pin_image,
    c.color,
    (COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0) -
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score,
    c.created_at,
    rp.rep_latitude,
    rp.rep_longitude
  FROM collections c
  INNER JOIN representative_pin rp ON rp.collection_id = c.id
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON p.collection_id = c.id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE c.is_public = true
    AND c.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
  GROUP BY c.id, u.username, u.profile_image, rp.rep_latitude, rp.rep_longitude
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_discover_collections_in_bounds(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_discover_collections_in_bounds(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER) TO anon;

COMMENT ON FUNCTION get_discover_collections_in_bounds IS
'Gets public collections with a pin inside the given lat/lng bounds, for the /map Discover tabs viewport-driven feed';

-- =============================================================================
-- Drop the now-superseded get_discover_collections - it was fully built but
-- never called anywhere in the app (confirmed via codebase search); this
-- bounds-aware version replaces it for the one place that would have used it.
-- =============================================================================
DROP FUNCTION IF EXISTS get_discover_collections(INTEGER);
