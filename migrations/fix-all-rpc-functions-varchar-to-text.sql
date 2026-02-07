-- Fix VARCHAR to TEXT type mismatch in all RPC functions
-- PostgreSQL collections.title is TEXT, not VARCHAR

-- =============================================================================
-- 1. get_friends_public_collections
-- =============================================================================
DROP FUNCTION IF EXISTS get_friends_public_collections();

CREATE OR REPLACE FUNCTION get_friends_public_collections()
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
    c.user_id,
    u.username,
    u.profile_image as user_profile_image,
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
  INNER JOIN users u ON c.user_id = u.id
  INNER JOIN follows f ON c.user_id = f.following_id
  LEFT JOIN pins p ON c.id = p.collection_id
  WHERE f.follower_id = auth.uid()
    AND c.is_public = true
  GROUP BY c.id, c.title, c.description, c.is_public, c.created_at, c.updated_at, c.user_id, u.username, u.profile_image
  ORDER BY c.updated_at DESC;
END;
$$;

-- =============================================================================
-- 2. get_discover_collections
-- =============================================================================
DROP FUNCTION IF EXISTS get_discover_collections(INTEGER);

CREATE OR REPLACE FUNCTION get_discover_collections(limit_count INTEGER DEFAULT 50)
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
    c.user_id,
    u.username,
    u.profile_image as user_profile_image,
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
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON c.id = p.collection_id
  WHERE c.is_public = true
    AND c.user_id != auth.uid()
  GROUP BY c.id, c.title, c.description, c.is_public, c.created_at, c.updated_at, c.user_id, u.username, u.profile_image
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- 3. get_public_collections_with_details
-- =============================================================================
DROP FUNCTION IF EXISTS get_public_collections_with_details();

CREATE OR REPLACE FUNCTION get_public_collections_with_details()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  username TEXT,
  user_profile_image TEXT,
  pin_count BIGINT,
  like_count BIGINT,
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
    c.created_at,
    c.user_id,
    u.username,
    u.profile_image as user_profile_image,
    COUNT(DISTINCT p.id) as pin_count,
    COUNT(DISTINCT cl.user_id) as like_count,
    (
      SELECT pi.image_url
      FROM pins p2
      LEFT JOIN pin_images pi ON p2.id = pi.pin_id
      WHERE p2.collection_id = c.id
      ORDER BY p2.created_at DESC, pi.upload_order ASC
      LIMIT 1
    ) as first_pin_image
  FROM collections c
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON c.id = p.collection_id
  LEFT JOIN collection_likes cl ON c.id = cl.collection_id
  WHERE c.is_public = true
  GROUP BY c.id, c.title, c.description, c.created_at, c.user_id, u.username, u.profile_image
  ORDER BY c.created_at DESC;
END;
$$;

-- =============================================================================
-- 4. get_collection_with_pin_count (if exists)
-- =============================================================================
DROP FUNCTION IF EXISTS get_collection_with_pin_count(UUID);

CREATE OR REPLACE FUNCTION get_collection_with_pin_count(collection_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  pin_count BIGINT,
  username TEXT,
  user_profile_image TEXT,
  like_count BIGINT
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
    c.user_id,
    COUNT(DISTINCT p.id) as pin_count,
    u.username,
    u.profile_image as user_profile_image,
    COUNT(DISTINCT cl.user_id) as like_count
  FROM collections c
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON c.id = p.collection_id
  LEFT JOIN collection_likes cl ON c.id = cl.collection_id
  WHERE c.id = collection_uuid
  GROUP BY c.id, c.title, c.description, c.is_public, c.created_at, c.updated_at, c.user_id, u.username, u.profile_image;
END;
$$;

-- =============================================================================
-- 5. get_following_users
-- =============================================================================
DROP FUNCTION IF EXISTS get_following_users();

CREATE OR REPLACE FUNCTION get_following_users()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  profile_image TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.profile_image,
    f.created_at as followed_at
  FROM follows f
  INNER JOIN users u ON f.following_id = u.id
  WHERE f.follower_id = auth.uid()
  ORDER BY f.created_at DESC;
END;
$$;

-- =============================================================================
-- Grant permissions to all functions
-- =============================================================================
GRANT EXECUTE ON FUNCTION get_friends_public_collections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_discover_collections(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_collections_with_details() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_with_pin_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_users() TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON FUNCTION get_friends_public_collections IS
'Get public collections from users you follow';

COMMENT ON FUNCTION get_discover_collections IS
'Get recently created public collections for discovery feed';

COMMENT ON FUNCTION get_public_collections_with_details IS
'Get all public collections with stats (legacy)';

COMMENT ON FUNCTION get_collection_with_pin_count IS
'Get single collection with pin count and user info';

COMMENT ON FUNCTION get_following_users IS
'Get list of users the current user follows';
