-- Create optimized function to get user collections with stats
-- This combines multiple queries into one efficient database call

-- Drop existing function if it exists (in case signature changed)
DROP FUNCTION IF EXISTS get_user_collections_with_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_collections_with_stats(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pin_count BIGINT,
  first_pin_image TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.is_public,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as pin_count,
    (
      SELECT pi.image_url
      FROM pins p2
      LEFT JOIN pin_images pi ON p2.id = pi.pin_id
      WHERE p2.collection_id = c.id
      ORDER BY p2.created_at DESC, pi.upload_order ASC
      LIMIT 1
    ) as first_pin_image
  FROM collections c
  LEFT JOIN pins p ON c.id = p.collection_id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.title, c.description, c.is_public, c.created_at, c.updated_at
  ORDER BY c.updated_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_collections_with_stats(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_collections_with_stats IS
'Efficiently fetches user collections with pin counts and first image in a single query';
