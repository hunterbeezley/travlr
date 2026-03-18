-- Create notifications table and triggers for follow and collection events

-- =============================================================================
-- 1. Create notifications table
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_follower', 'friend_collection')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  actor_username TEXT,
  actor_profile_image TEXT,
  related_id UUID, -- Can be collection_id or follow_id
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 2. Trigger function for new followers
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_username TEXT;
  follower_profile_image TEXT;
BEGIN
  -- Get follower details
  SELECT username, profile_image
  INTO follower_username, follower_profile_image
  FROM users
  WHERE id = NEW.follower_id;

  -- Create notification for the user being followed
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
    NEW.following_id,
    'new_follower',
    'New Follower',
    COALESCE(follower_username, 'Someone') || ' started following you',
    NEW.follower_id,
    follower_username,
    follower_profile_image,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_new_follower ON follows;

-- Create trigger for new follows
CREATE TRIGGER on_new_follower
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- =============================================================================
-- 3. Trigger function for new friend collections
-- =============================================================================
CREATE OR REPLACE FUNCTION notify_friend_collection()
RETURNS TRIGGER AS $$
DECLARE
  creator_username TEXT;
  creator_profile_image TEXT;
  follower_record RECORD;
BEGIN
  -- Only notify for public collections
  IF NEW.is_public = TRUE THEN
    -- Get creator details
    SELECT username, profile_image
    INTO creator_username, creator_profile_image
    FROM users
    WHERE id = NEW.user_id;

    -- Create notification for all followers
    FOR follower_record IN
      SELECT follower_id
      FROM follows
      WHERE following_id = NEW.user_id
    LOOP
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
        follower_record.follower_id,
        'friend_collection',
        'New Collection',
        COALESCE(creator_username, 'Someone') || ' created "' || NEW.title || '"',
        NEW.user_id,
        creator_username,
        creator_profile_image,
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_new_friend_collection ON collections;

-- Create trigger for new public collections
CREATE TRIGGER on_new_friend_collection
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_collection();

-- =============================================================================
-- 4. Function to get user notifications
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_notifications(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  actor_id UUID,
  actor_username TEXT,
  actor_profile_image TEXT,
  related_id UUID,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.actor_id,
    n.actor_username,
    n.actor_profile_image,
    n.related_id,
    n.is_read,
    n.created_at
  FROM notifications n
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- 5. Function to get unread notification count
-- =============================================================================
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO unread_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = FALSE;

  RETURN unread_count;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION get_user_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON TABLE notifications IS
'Stores user notifications for follows and friend collections';

COMMENT ON FUNCTION notify_new_follower IS
'Trigger function that creates a notification when someone follows a user';

COMMENT ON FUNCTION notify_friend_collection IS
'Trigger function that creates notifications for followers when someone creates a public collection';

COMMENT ON FUNCTION get_user_notifications IS
'Gets recent notifications for the current user';

COMMENT ON FUNCTION get_unread_notification_count IS
'Gets count of unread notifications for the current user';
