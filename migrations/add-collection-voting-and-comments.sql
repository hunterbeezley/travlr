-- Add voting and comments functionality to collections
-- Part of Issue #30 - Phase 1: Voting System

-- =============================================================================
-- 1. Create collection_votes table
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_votes_collection_id ON collection_votes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_votes_user_id ON collection_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_votes_created_at ON collection_votes(created_at DESC);

-- Enable RLS
ALTER TABLE collection_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for votes
DROP POLICY IF EXISTS "Anyone can view votes" ON collection_votes;
CREATE POLICY "Anyone can view votes"
  ON collection_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create their own votes" ON collection_votes;
CREATE POLICY "Users can create their own votes"
  ON collection_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON collection_votes;
CREATE POLICY "Users can update their own votes"
  ON collection_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON collection_votes;
CREATE POLICY "Users can delete their own votes"
  ON collection_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 2. Create collection_comments table
-- =============================================================================
CREATE TABLE IF NOT EXISTS collection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_comments_collection_id ON collection_comments(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_comments_user_id ON collection_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_comments_created_at ON collection_comments(created_at DESC);

-- Enable RLS
ALTER TABLE collection_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
DROP POLICY IF EXISTS "Anyone can view comments on public collections" ON collection_comments;
CREATE POLICY "Anyone can view comments on public collections"
  ON collection_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_comments.collection_id
      AND (collections.is_public = true OR collections.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create comments on public collections" ON collection_comments;
CREATE POLICY "Users can create comments on public collections"
  ON collection_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_id
      AND (collections.is_public = true OR collections.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON collection_comments;
CREATE POLICY "Users can update their own comments"
  ON collection_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON collection_comments;
CREATE POLICY "Users can delete their own comments"
  ON collection_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. Function to toggle vote on a collection
-- =============================================================================
CREATE OR REPLACE FUNCTION toggle_collection_vote(
  p_collection_id UUID,
  p_vote_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate vote type
  IF p_vote_type NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid vote type. Must be "up" or "down"';
  END IF;

  -- Check if user already voted
  SELECT vote_type INTO v_existing_vote
  FROM collection_votes
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;

  -- If no existing vote, create one
  IF v_existing_vote IS NULL THEN
    INSERT INTO collection_votes (collection_id, user_id, vote_type)
    VALUES (p_collection_id, v_user_id, p_vote_type);

    v_result := json_build_object(
      'action', 'created',
      'vote_type', p_vote_type
    );

  -- If same vote type, remove it (toggle off)
  ELSIF v_existing_vote = p_vote_type THEN
    DELETE FROM collection_votes
    WHERE collection_id = p_collection_id
      AND user_id = v_user_id;

    v_result := json_build_object(
      'action', 'removed',
      'vote_type', NULL
    );

  -- If different vote type, update it
  ELSE
    UPDATE collection_votes
    SET vote_type = p_vote_type,
        updated_at = NOW()
    WHERE collection_id = p_collection_id
      AND user_id = v_user_id;

    v_result := json_build_object(
      'action', 'updated',
      'vote_type', p_vote_type
    );
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 4. Function to get vote counts for a collection
-- =============================================================================
CREATE OR REPLACE FUNCTION get_collection_vote_counts(p_collection_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upvotes INTEGER;
  v_downvotes INTEGER;
  v_net_score INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'up'),
    COUNT(*) FILTER (WHERE vote_type = 'down')
  INTO v_upvotes, v_downvotes
  FROM collection_votes
  WHERE collection_id = p_collection_id;

  v_net_score := COALESCE(v_upvotes, 0) - COALESCE(v_downvotes, 0);

  RETURN json_build_object(
    'upvotes', COALESCE(v_upvotes, 0),
    'downvotes', COALESCE(v_downvotes, 0),
    'net_score', v_net_score
  );
END;
$$;

-- =============================================================================
-- 5. Function to get user's vote on a collection
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_vote_on_collection(p_collection_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_vote_type TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT vote_type INTO v_vote_type
  FROM collection_votes
  WHERE collection_id = p_collection_id
    AND user_id = v_user_id;

  RETURN v_vote_type;
END;
$$;

-- =============================================================================
-- 6. Enhanced function to get collections with vote counts
-- =============================================================================
CREATE OR REPLACE FUNCTION get_collections_with_vote_counts(
  p_user_id UUID DEFAULT NULL,
  p_public_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  is_public BOOLEAN,
  color TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pin_count BIGINT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.title,
    c.description,
    c.is_public,
    c.color,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT p.id) AS pin_count,
    COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0)::INTEGER AS upvotes,
    COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0)::INTEGER AS downvotes,
    (COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'up'), 0) -
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score
  FROM collections c
  LEFT JOIN pins p ON p.collection_id = c.id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE
    (p_user_id IS NULL OR c.user_id = p_user_id)
    AND (NOT p_public_only OR c.is_public = true)
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 7. Update get_user_collections_with_stats to include vote counts
-- =============================================================================
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
  first_pin_image TEXT,
  color TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER
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
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score
  FROM collections c
  LEFT JOIN pins p ON c.id = p.collection_id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.title, c.description, c.is_public, c.created_at, c.updated_at, c.color
  ORDER BY c.updated_at DESC;
END;
$$;

-- =============================================================================
-- 8. Update get_friends_public_collections to include vote counts
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
  first_pin_image TEXT,
  color TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER
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
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score
  FROM collections c
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON p.collection_id = c.id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE c.is_public = true
    AND c.user_id IN (
      SELECT following_id
      FROM follows
      WHERE follower_id = auth.uid()
    )
  GROUP BY c.id, u.username, u.profile_image
  ORDER BY c.created_at DESC;
END;
$$;

-- =============================================================================
-- 9. Update get_discover_collections to include vote counts
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
  first_pin_image TEXT,
  color TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  net_score INTEGER
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
     COALESCE(COUNT(cv.id) FILTER (WHERE cv.vote_type = 'down'), 0))::INTEGER AS net_score
  FROM collections c
  INNER JOIN users u ON c.user_id = u.id
  LEFT JOIN pins p ON p.collection_id = c.id
  LEFT JOIN collection_votes cv ON cv.collection_id = c.id
  WHERE c.is_public = true
    AND c.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
  GROUP BY c.id, u.username, u.profile_image
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION toggle_collection_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_vote_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vote_on_collection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collections_with_vote_counts(UUID, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_collections_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_public_collections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_discover_collections(INTEGER) TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON TABLE collection_votes IS
'Stores upvotes and downvotes on collections';

COMMENT ON TABLE collection_comments IS
'Stores user comments on collections';

COMMENT ON FUNCTION toggle_collection_vote IS
'Toggles a user vote on a collection (creates, updates, or removes)';

COMMENT ON FUNCTION get_collection_vote_counts IS
'Gets vote counts (upvotes, downvotes, net score) for a collection';

COMMENT ON FUNCTION get_user_vote_on_collection IS
'Gets the current user vote state on a collection';

COMMENT ON FUNCTION get_collections_with_vote_counts IS
'Gets collections with their vote counts included';

COMMENT ON FUNCTION get_user_collections_with_stats IS
'Efficiently fetches user collections with pin counts, color, and vote counts';

COMMENT ON FUNCTION get_friends_public_collections IS
'Gets public collections from followed users with vote counts';

COMMENT ON FUNCTION get_discover_collections IS
'Gets recent public collections from other users with vote counts';
