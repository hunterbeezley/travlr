-- Fix multiple issues with notifications and following suggestions
-- Issues:
-- 1. notifications table missing "link" column (code 42703)
-- 2. notifications table missing "metadata" column (code 42703)
-- 3. get_following_suggestions has ambiguous "user_id" reference (code 42702)

-- ============================================================================
-- 1. Add missing columns to notifications table
-- ============================================================================

-- Add "link" column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- Add "metadata" column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_notifications_link ON notifications(link);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN(metadata);

-- ============================================================================
-- 2. Fix get_following_suggestions function - remove ambiguous user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION get_following_suggestions(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  reason TEXT,
  mutual_friends INT,
  common_interests INT,
  relevance_score NUMERIC
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH current_following AS (
    -- Users already following
    SELECT uf.following_id
    FROM user_follows uf
    WHERE uf.follower_id = v_user_id
  ),
  user_collections_liked AS (
    -- Collections current user has liked
    SELECT cl.collection_id
    FROM collection_likes cl
    WHERE cl.user_id = v_user_id
  ),
  similar_users AS (
    -- Users who liked similar collections
    SELECT
      cl.user_id AS suggested_user_id,
      COUNT(*) AS common_likes,
      'Similar taste in collections' AS reason
    FROM collection_likes cl
    INNER JOIN user_collections_liked ucl ON cl.collection_id = ucl.collection_id
    WHERE cl.user_id != v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM current_following cf WHERE cf.following_id = cl.user_id
      )
    GROUP BY cl.user_id
  ),
  friends_of_friends AS (
    -- Friends of people you follow
    SELECT
      uf2.following_id AS suggested_user_id,
      COUNT(*) AS mutual_count,
      'Friend of ' || COUNT(*) || ' people you follow' AS reason
    FROM user_follows uf1
    INNER JOIN user_follows uf2 ON uf2.follower_id = uf1.following_id
    WHERE uf1.follower_id = v_user_id
      AND uf2.following_id != v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM current_following cf WHERE cf.following_id = uf2.following_id
      )
    GROUP BY uf2.following_id
  ),
  popular_users AS (
    -- Popular users (many followers)
    SELECT
      uf.following_id AS suggested_user_id,
      COUNT(*) AS follower_count,
      'Popular creator' AS reason
    FROM user_follows uf
    WHERE uf.following_id != v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM current_following cf WHERE cf.following_id = uf.following_id
      )
    GROUP BY uf.following_id
    HAVING COUNT(*) > 5
  ),
  common_interests_users AS (
    -- Users with similar interests
    SELECT
      ui2.user_id AS suggested_user_id,
      COUNT(*) AS common_interest_count,
      'Similar interests' AS reason
    FROM user_interests ui1
    INNER JOIN user_interests ui2 ON
      ui2.interest_type = ui1.interest_type
      AND ui2.interest_value = ui1.interest_value
      AND ui2.user_id != v_user_id
    WHERE ui1.user_id = v_user_id
      AND NOT EXISTS (
        SELECT 1 FROM current_following cf WHERE cf.following_id = ui2.user_id
      )
    GROUP BY ui2.user_id
  ),
  all_suggestions AS (
    SELECT
      su.suggested_user_id,
      su.reason,
      COALESCE(su.common_likes, 0) AS common_interests,
      COALESCE(fof.mutual_count, 0) AS mutual_friends,
      (
        COALESCE(su.common_likes, 0) * 3 +
        COALESCE(fof.mutual_count, 0) * 2 +
        COALESCE(ciu.common_interest_count, 0) * 1.5 +
        COALESCE(pu.follower_count, 0) * 0.1
      ) AS relevance_score
    FROM similar_users su
    FULL OUTER JOIN friends_of_friends fof USING (suggested_user_id)
    FULL OUTER JOIN popular_users pu USING (suggested_user_id)
    FULL OUTER JOIN common_interests_users ciu USING (suggested_user_id)
    WHERE COALESCE(su.suggested_user_id, fof.suggested_user_id, pu.suggested_user_id, ciu.suggested_user_id) IS NOT NULL
  )
  SELECT
    u.id AS user_id,
    u.username,
    u.profile_image AS avatar_url,
    COALESCE(
      CASE
        WHEN asug.mutual_friends > 0 THEN asug.reason
        WHEN asug.common_interests > 0 THEN asug.reason
        ELSE asug.reason
      END,
      'Suggested for you'
    ) AS reason,
    asug.mutual_friends::INT,
    asug.common_interests::INT,
    asug.relevance_score
  FROM all_suggestions asug
  JOIN users u ON u.id = asug.suggested_user_id
  ORDER BY asug.relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check that link and metadata columns now exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name IN ('link', 'metadata')
ORDER BY column_name;

-- Test the fixed function (should not error)
-- SELECT * FROM get_following_suggestions(5);
