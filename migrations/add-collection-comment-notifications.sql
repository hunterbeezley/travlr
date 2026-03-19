-- Add collection comment notifications
-- This migration adds notifications when users comment on collections

-- =============================================================================
-- 1. Update notification type constraint to include collection_comment
-- =============================================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_follower', 'friend_collection', 'collection_comment'));

-- =============================================================================
-- 2. Create trigger function for collection comments
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_collection_comment()
RETURNS TRIGGER AS $$
DECLARE
  commenter_username TEXT;
  commenter_profile_image TEXT;
  collection_owner_id UUID;
  collection_title TEXT;
BEGIN
  -- Get the collection owner and title
  SELECT user_id, title
  INTO collection_owner_id, collection_title
  FROM collections
  WHERE id = NEW.collection_id;

  -- Only create notification if commenter is not the collection owner
  IF collection_owner_id != NEW.user_id THEN
    -- Get commenter details
    SELECT username, profile_image
    INTO commenter_username, commenter_profile_image
    FROM users
    WHERE id = NEW.user_id;

    -- Create notification for collection owner
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
      collection_owner_id,
      'collection_comment',
      'New Comment',
      COALESCE(commenter_username, 'Someone') || ' commented on "' || collection_title || '"',
      NEW.user_id,
      commenter_username,
      commenter_profile_image,
      NEW.collection_id -- Store collection_id so we can link to it
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. Create trigger for new comments
-- =============================================================================
DROP TRIGGER IF EXISTS on_collection_comment ON collection_comments;

CREATE TRIGGER on_collection_comment
  AFTER INSERT ON collection_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_collection_comment();

-- =============================================================================
-- Add comment
-- =============================================================================
COMMENT ON FUNCTION notify_collection_comment IS
'Trigger function that creates a notification when someone comments on a collection';
