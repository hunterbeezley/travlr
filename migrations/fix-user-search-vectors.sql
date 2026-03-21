-- Fix user search to ensure all users are searchable
-- This fixes issue #119 where searching for 'chuck' returns no results

-- 1. Ensure all users have search_vector populated
UPDATE users
SET search_vector =
  setweight(to_tsvector('english', COALESCE(username, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(full_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'D')
WHERE search_vector IS NULL
   OR search_vector = to_tsvector('english', '');

-- 2. Create or replace trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION update_user_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_search_vector_update ON users;
CREATE TRIGGER users_search_vector_update
  BEFORE INSERT OR UPDATE OF username, full_name, bio, email
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_search_vector();

-- 3. Improve search_users function to handle partial matches better
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
    CASE
      -- Empty search returns all users
      WHEN search_query = '' THEN 0
      -- Full-text search rank
      WHEN u.search_vector @@ plainto_tsquery('english', search_query) THEN
        ts_rank(u.search_vector, plainto_tsquery('english', search_query))
      -- Exact match on username gets highest priority
      WHEN LOWER(u.username) = LOWER(search_query) THEN 1.0
      -- Username starts with query
      WHEN LOWER(u.username) LIKE LOWER(search_query) || '%' THEN 0.8
      -- Username contains query
      WHEN LOWER(u.username) LIKE '%' || LOWER(search_query) || '%' THEN 0.6
      -- Full name starts with query
      WHEN LOWER(u.full_name) LIKE LOWER(search_query) || '%' THEN 0.5
      -- Full name contains query
      WHEN LOWER(u.full_name) LIKE '%' || LOWER(search_query) || '%' THEN 0.4
      ELSE 0
    END AS rank
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
    -- Empty search query returns everyone
    search_query = ''
    -- Full-text search
    OR u.search_vector @@ plainto_tsquery('english', search_query)
    -- Partial match on username (case-insensitive)
    OR LOWER(u.username) LIKE '%' || LOWER(search_query) || '%'
    -- Partial match on full_name (case-insensitive)
    OR LOWER(u.full_name) LIKE '%' || LOWER(search_query) || '%'
    -- Partial match on email (case-insensitive)
    OR LOWER(u.email) LIKE '%' || LOWER(search_query) || '%'
  ORDER BY rank DESC, follower_counts.count DESC NULLS LAST, u.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Update all existing users one more time to be sure
UPDATE users
SET username = username -- Triggers the search_vector update via trigger
WHERE id IS NOT NULL;
