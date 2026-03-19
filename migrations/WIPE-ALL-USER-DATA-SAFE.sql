-- ============================================================================
-- SAFE COMPLETE DATA WIPE FOR BETA TESTING
-- ============================================================================
-- This script deletes ALL user data while preserving database structure.
-- Only deletes from tables that actually exist (no errors for missing tables).
--
-- WARNING: This is DESTRUCTIVE and IRREVERSIBLE!
-- Only run this on development/staging databases, NOT production!
-- ============================================================================

DO $$
BEGIN
  -- Disable triggers temporarily for faster deletion
  SET session_replication_role = 'replica';

  RAISE NOTICE 'Starting data wipe...';

  -- ============================================================================
  -- Delete from tables that exist (in dependency order)
  -- ============================================================================

  -- Notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DELETE FROM notifications;
    RAISE NOTICE '✓ Deleted notifications';
  END IF;

  -- Comment Reports
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_reports') THEN
    DELETE FROM comment_reports;
    RAISE NOTICE '✓ Deleted comment_reports';
  END IF;

  -- Comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    DELETE FROM comments;
    RAISE NOTICE '✓ Deleted comments';
  END IF;

  -- Collection Votes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_votes') THEN
    DELETE FROM collection_votes;
    RAISE NOTICE '✓ Deleted collection_votes';
  END IF;

  -- Feed Activities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feed_activities') THEN
    DELETE FROM feed_activities;
    RAISE NOTICE '✓ Deleted feed_activities';
  END IF;

  -- Collection Shares
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_shares') THEN
    DELETE FROM collection_shares;
    RAISE NOTICE '✓ Deleted collection_shares';
  END IF;

  -- Collection Views
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_views') THEN
    DELETE FROM collection_views;
    RAISE NOTICE '✓ Deleted collection_views';
  END IF;

  -- Saved Collections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_collections') THEN
    DELETE FROM saved_collections;
    RAISE NOTICE '✓ Deleted saved_collections';
  END IF;

  -- Collection Likes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_likes') THEN
    DELETE FROM collection_likes;
    RAISE NOTICE '✓ Deleted collection_likes';
  END IF;

  -- User Follows
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_follows') THEN
    DELETE FROM user_follows;
    RAISE NOTICE '✓ Deleted user_follows';
  END IF;

  -- User Interests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_interests') THEN
    DELETE FROM user_interests;
    RAISE NOTICE '✓ Deleted user_interests';
  END IF;

  -- User Badges
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_badges') THEN
    DELETE FROM user_badges;
    RAISE NOTICE '✓ Deleted user_badges';
  END IF;

  -- User Verification
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_verification') THEN
    DELETE FROM user_verification;
    RAISE NOTICE '✓ Deleted user_verification';
  END IF;

  -- Notification Preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    DELETE FROM notification_preferences;
    RAISE NOTICE '✓ Deleted notification_preferences';
  END IF;

  -- Featured Collections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'featured_collections') THEN
    DELETE FROM featured_collections;
    RAISE NOTICE '✓ Deleted featured_collections';
  END IF;

  -- Collection Analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_analytics') THEN
    DELETE FROM collection_analytics;
    RAISE NOTICE '✓ Deleted collection_analytics';
  END IF;

  -- Pin Images (must be before pins)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pin_images') THEN
    DELETE FROM pin_images;
    RAISE NOTICE '✓ Deleted pin_images';
  END IF;

  -- Pins
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pins') THEN
    DELETE FROM pins;
    RAISE NOTICE '✓ Deleted pins';
  END IF;

  -- Collections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') THEN
    DELETE FROM collections;
    RAISE NOTICE '✓ Deleted collections';
  END IF;

  -- GDPR Data Deletion Requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gdpr_data_deletion_requests') THEN
    DELETE FROM gdpr_data_deletion_requests;
    RAISE NOTICE '✓ Deleted gdpr_data_deletion_requests';
  END IF;

  -- GDPR Consent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gdpr_consent') THEN
    DELETE FROM gdpr_consent;
    RAISE NOTICE '✓ Deleted gdpr_consent';
  END IF;

  -- Users (profile data - NOT auth.users)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    DELETE FROM users;
    RAISE NOTICE '✓ Deleted users';
  END IF;

  -- Re-enable triggers
  SET session_replication_role = 'origin';

  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ Data wipe completed successfully!';
  RAISE NOTICE '===========================================';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  users_count bigint;
  collections_count bigint;
  pins_count bigint;
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICATION - Checking table counts:';
  RAISE NOTICE '===========================================';

  -- Check users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    SELECT COUNT(*) INTO users_count FROM users;
    RAISE NOTICE 'users: %', users_count;
  ELSE
    RAISE NOTICE 'users: table does not exist';
  END IF;

  -- Check collections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') THEN
    SELECT COUNT(*) INTO collections_count FROM collections;
    RAISE NOTICE 'collections: %', collections_count;
  ELSE
    RAISE NOTICE 'collections: table does not exist';
  END IF;

  -- Check pins
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pins') THEN
    SELECT COUNT(*) INTO pins_count FROM pins;
    RAISE NOTICE 'pins: %', pins_count;
  ELSE
    RAISE NOTICE 'pins: table does not exist';
  END IF;

  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ All user data has been wiped successfully!';
  RAISE NOTICE '🔄 Users will need to create profiles when they log in';
  RAISE NOTICE '⚠️  Note: Supabase Auth users still exist - they will create new profiles on first login';
  RAISE NOTICE '===========================================';
END $$;
