-- Add emoji reactions to comments
-- Part of Issue #80 - Emoji Reactions

-- =============================================================================
-- 1. Create comment_reactions table
-- =============================================================================
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES collection_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_created_at ON comment_reactions(created_at DESC);

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. RLS Policies for reactions
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view reactions" ON comment_reactions;
CREATE POLICY "Anyone can view reactions"
  ON comment_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON comment_reactions;
CREATE POLICY "Users can add reactions"
  ON comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON comment_reactions;
CREATE POLICY "Users can remove own reactions"
  ON comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. Function to toggle reaction on a comment
-- =============================================================================
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
  p_comment_id UUID,
  p_emoji TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_reaction BOOLEAN;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate emoji
  IF p_emoji NOT IN ('👍', '❤️', '😂', '😮', '😢') THEN
    RAISE EXCEPTION 'Invalid emoji. Must be one of: 👍, ❤️, 😂, 😮, 😢';
  END IF;

  -- Check if user already reacted with this emoji
  SELECT EXISTS(
    SELECT 1 FROM comment_reactions
    WHERE comment_id = p_comment_id
      AND user_id = v_user_id
      AND emoji = p_emoji
  ) INTO v_existing_reaction;

  -- If reaction exists, remove it (toggle off)
  IF v_existing_reaction THEN
    DELETE FROM comment_reactions
    WHERE comment_id = p_comment_id
      AND user_id = v_user_id
      AND emoji = p_emoji;

    v_result := json_build_object(
      'action', 'removed',
      'emoji', p_emoji
    );

  -- If reaction doesn't exist, create it
  ELSE
    INSERT INTO comment_reactions (comment_id, user_id, emoji)
    VALUES (p_comment_id, v_user_id, p_emoji);

    v_result := json_build_object(
      'action', 'added',
      'emoji', p_emoji
    );
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 4. Function to get reactions for a comment
-- =============================================================================
CREATE OR REPLACE FUNCTION get_comment_reactions(p_comment_id UUID)
RETURNS TABLE (
  emoji TEXT,
  count BIGINT,
  users UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.emoji,
    COUNT(*)::BIGINT as count,
    ARRAY_AGG(cr.user_id) as users
  FROM comment_reactions cr
  WHERE cr.comment_id = p_comment_id
  GROUP BY cr.emoji
  ORDER BY count DESC, cr.emoji;
END;
$$;

-- =============================================================================
-- 5. Function to get user's reactions on a comment
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_reactions_on_comment(p_comment_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_reactions TEXT[];
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  SELECT ARRAY_AGG(emoji) INTO v_reactions
  FROM comment_reactions
  WHERE comment_id = p_comment_id
    AND user_id = v_user_id;

  RETURN COALESCE(v_reactions, ARRAY[]::TEXT[]);
END;
$$;

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION toggle_comment_reaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_reactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_reactions_on_comment(UUID) TO authenticated;

-- =============================================================================
-- 7. Add comments
-- =============================================================================
COMMENT ON TABLE comment_reactions IS
'Stores emoji reactions on collection comments';

COMMENT ON FUNCTION toggle_comment_reaction IS
'Toggles an emoji reaction on a comment (adds or removes)';

COMMENT ON FUNCTION get_comment_reactions IS
'Gets all reactions for a comment with counts and user lists';

COMMENT ON FUNCTION get_user_reactions_on_comment IS
'Gets the current user emoji reactions on a comment';
