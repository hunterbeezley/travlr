-- Add search functionality for collections and users
-- Migration: add-search-functionality.sql
-- Created: 2026-03-20

-- Add search vector column to collections table
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_collections_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS collections_search_vector_update ON collections;
CREATE TRIGGER collections_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, location
  ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_search_vector();

-- Update existing records
UPDATE collections
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(location, '')), 'C')
WHERE search_vector IS NULL;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS collections_search_idx
ON collections USING GIN(search_vector);

-- Create index for location-based filtering
CREATE INDEX IF NOT EXISTS collections_location_idx
ON collections(location)
WHERE location IS NOT NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS collections_category_idx
ON collections(category)
WHERE category IS NOT NULL;

-- Add search vector to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update user search vector
CREATE OR REPLACE FUNCTION update_users_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user search vector
DROP TRIGGER IF EXISTS users_search_vector_update ON users;
CREATE TRIGGER users_search_vector_update
  BEFORE INSERT OR UPDATE OF username, full_name, bio
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_search_vector();

-- Update existing user records
UPDATE users
SET search_vector =
  setweight(to_tsvector('english', COALESCE(username, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(full_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'B')
WHERE search_vector IS NULL;

-- Create GIN index for user search
CREATE INDEX IF NOT EXISTS users_search_idx
ON users USING GIN(search_vector);

-- Create RPC function for searching collections
CREATE OR REPLACE FUNCTION search_collections(
  search_query TEXT,
  filter_category TEXT DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance', -- relevance, recent, popular
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
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.location,
    c.category,
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
  WHERE
    c.is_public = true
    AND (
      search_query = ''
      OR c.search_vector @@ plainto_tsquery('english', search_query)
      OR c.title ILIKE '%' || search_query || '%'
    )
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_location IS NULL OR c.location ILIKE '%' || filter_location || '%')
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
$$ LANGUAGE plpgsql STABLE;

-- Create RPC function for searching users
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  bio TEXT,
  email TEXT,
  profile_image TEXT,
  location TEXT,
  follower_count BIGINT,
  collection_count BIGINT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.bio,
    u.email,
    u.profile_image,
    u.location,
    COALESCE(follower_counts.count, 0) AS follower_count,
    COALESCE(collection_counts.count, 0) AS collection_count,
    ts_rank(u.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM users u
  LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM user_follows
    GROUP BY following_id
  ) follower_counts ON u.id = follower_counts.following_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM collections
    WHERE is_public = true
    GROUP BY user_id
  ) collection_counts ON u.id = collection_counts.user_id
  WHERE
    search_query = ''
    OR u.search_vector @@ plainto_tsquery('english', search_query)
    OR u.username ILIKE '%' || search_query || '%'
    OR u.full_name ILIKE '%' || search_query || '%'
  ORDER BY rank DESC, follower_counts.count DESC NULLS LAST, u.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_collections TO authenticated;
GRANT EXECUTE ON FUNCTION search_users TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION search_collections IS 'Full-text search for public collections with filtering and sorting';
COMMENT ON FUNCTION search_users IS 'Full-text search for users by username, name, or bio';
