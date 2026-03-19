-- Add @ mention notifications for comments
-- This migration adds notifications when users are mentioned in comments

-- =============================================================================
-- 1. Update notification type constraint to include mention
-- =============================================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_follower', 'friend_collection', 'collection_comment', 'mention'));

-- =============================================================================
-- 2. Create function to extract usernames from @ mentions
-- =============================================================================
CREATE OR REPLACE FUNCTION extract_mentions(comment_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  mentions TEXT[];
BEGIN
  -- Extract all @username mentions using regex
  -- Matches @word_characters (letters, numbers, underscores)
  SELECT array_agg(DISTINCT lower(substring(match FROM 2)))
  INTO mentions
  FROM regexp_matches(comment_text, '@([a-zA-Z0-9_]+)', 'g') AS match;

  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 3. Create trigger function for mention notifications
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id UUID;
  commenter_username TEXT;
  commenter_profile_image TEXT;
  collection_title TEXT;
  collection_owner_id UUID;
  mentions TEXT[];
BEGIN
  -- Extract mentions from comment text
  mentions := extract_mentions(NEW.comment_text);

  -- If no mentions found, return
  IF array_length(mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get commenter details
  SELECT username, profile_image
  INTO commenter_username, commenter_profile_image
  FROM users
  WHERE id = NEW.user_id;

  -- Get collection details
  SELECT title, user_id
  INTO collection_title, collection_owner_id
  FROM collections
  WHERE id = NEW.collection_id;

  -- Create notification for each mentioned user
  FOREACH mentioned_username IN ARRAY mentions
  LOOP
    -- Find the mentioned user by username (case-insensitive)
    SELECT id INTO mentioned_user_id
    FROM users
    WHERE lower(username) = lower(mentioned_username);

    -- Only create notification if:
    -- 1. User exists
    -- 2. Mentioned user is not the commenter themselves
    -- 3. Mentioned user is not the collection owner (they get comment notification already)
    IF mentioned_user_id IS NOT NULL
       AND mentioned_user_id != NEW.user_id
       AND mentioned_user_id != collection_owner_id THEN

      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        actor_id,
        actor_username,
        actor_profile_image,
        related_id
      ) VALUES (
        mentioned_user_id,
        'mention',
        'You Were Mentioned',
        COALESCE(commenter_username, 'Someone') || ' mentioned you in a comment on "' || collection_title || '"',
        NEW.user_id,
        commenter_username,
        commenter_profile_image,
        NEW.collection_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. Create trigger for mention notifications
-- =============================================================================
DROP TRIGGER IF EXISTS on_comment_mention ON collection_comments;

CREATE TRIGGER on_comment_mention
  AFTER INSERT ON collection_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_mentions();

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON FUNCTION extract_mentions IS
'Extracts @username mentions from comment text';

COMMENT ON FUNCTION notify_comment_mentions IS
'Trigger function that creates notifications when users are mentioned in comments';

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION extract_mentions(TEXT) TO authenticated;
