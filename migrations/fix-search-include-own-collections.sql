-- Fix search to include user's own collections (even if private)
-- This ensures users can find their own collections when searching

CREATE OR REPLACE FUNCTION search_collections(
  search_query TEXT,
  filter_category TEXT DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  category TEXT,
  color TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  user_id UUID,
  pin_count BIGINT,
  rank REAL
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    NULL::TEXT AS location,
    NULL::TEXT AS category,
    c.color,
    c.is_public,
    c.created_at,
    c.user_id,
    COALESCE(pin_counts.count, 0) AS pin_count,
    CASE
      WHEN sort_by = 'relevance' THEN ts_rank(c.search_vector, plainto_tsquery('english', search_query))
      ELSE 0
    END AS rank
  FROM collections c
  LEFT JOIN (
    SELECT collection_id, COUNT(*) as count
    FROM pins
    GROUP BY collection_id
  ) pin_counts ON c.id = pin_counts.collection_id
  LEFT JOIN LATERAL (
    SELECT 1
    FROM pins p
    WHERE p.collection_id = c.id
      AND (filter_location IS NULL OR p.location ILIKE '%' || filter_location || '%')
    LIMIT 1
  ) location_filter ON (filter_location IS NULL OR location_filter IS NOT NULL)
  WHERE
    (c.is_public = true OR c.user_id = v_user_id)  -- Include own collections even if private
    AND (
      search_query = ''
      OR c.search_vector @@ plainto_tsquery('english', search_query)
      OR c.title ILIKE '%' || search_query || '%'
      OR c.description ILIKE '%' || search_query || '%'
    )
  ORDER BY
    CASE
      WHEN sort_by = 'relevance' THEN ts_rank(c.search_vector, plainto_tsquery('english', search_query))
      ELSE 0
    END DESC,
    CASE WHEN sort_by = 'recent' THEN c.created_at END DESC,
    CASE WHEN sort_by = 'popular' THEN pin_counts.count END DESC NULLS LAST,
    c.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update existing collections to ensure search_vector is populated
UPDATE collections
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL OR search_vector = '';

-- Also update any collections that might have empty search vectors
UPDATE collections
SET title = title  -- Triggers the search_vector update via trigger
WHERE search_vector IS NULL;
