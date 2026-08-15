-- Fix: get_discover_collections_in_bounds declared rep_latitude/rep_longitude
-- as NUMERIC, but pins.latitude/pins.longitude are DOUBLE PRECISION, causing
-- every call to fail with "structure of query does not match function
-- result type" (Postgres error 42804). CREATE OR REPLACE can't change a
-- function's return type, so this drops and recreates it.
-- Part of Issue #147

DROP FUNCTION IF EXISTS get_discover_collections_in_bounds(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER);

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
