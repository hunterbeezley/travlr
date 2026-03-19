-- ============================================================================
-- COMPLETE DATA WIPE FOR BETA TESTING
-- ============================================================================
-- This script deletes ALL user data while preserving database structure.
-- Run this before deploying to beta testers for a fresh start.
--
-- WARNING: This is DESTRUCTIVE and IRREVERSIBLE!
-- Only run this on development/staging databases, NOT production!
-- ============================================================================

BEGIN;

-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- ============================================================================
-- STEP 1: Delete data from tables with foreign key dependencies
-- (Start with tables that depend on others, work backwards)
-- ============================================================================

-- Notifications (references multiple tables)
DELETE FROM notifications;

-- Comment Reports
DELETE FROM comment_reports;

-- Comments (references collections and users)
DELETE FROM comments;

-- Collection Votes (references collections and users)
DELETE FROM collection_votes;

-- Feed Activities (social feed data)
DELETE FROM feed_activities;

-- Collection Shares (social engagement)
DELETE FROM collection_shares;

-- Collection Views (analytics)
DELETE FROM collection_views;

-- Saved Collections (user favorites with folders)
DELETE FROM saved_collections;

-- Collection Likes (social engagement)
DELETE FROM collection_likes;

-- User Follows (social graph)
DELETE FROM user_follows;

-- User Interests (personalization data)
DELETE FROM user_interests;

-- User Badges (gamification)
DELETE FROM user_badges;

-- User Verification (verified accounts)
DELETE FROM user_verification;

-- Notification Preferences (user settings)
DELETE FROM notification_preferences;

-- Featured Collections (editorial curation)
DELETE FROM featured_collections;

-- Collection Analytics (performance metrics)
DELETE FROM collection_analytics;

-- ============================================================================
-- STEP 2: Delete core content (pins and collections)
-- ============================================================================

-- Pins (references collections and users)
DELETE FROM pins;

-- Collections (references users)
DELETE FROM collections;

-- ============================================================================
-- STEP 3: Delete GDPR-related data
-- ============================================================================

-- GDPR Data Deletion Requests
DELETE FROM gdpr_data_deletion_requests;

-- GDPR Consent Records
DELETE FROM gdpr_consent;

-- ============================================================================
-- STEP 4: Delete user profiles (but NOT auth.users managed by Supabase)
-- ============================================================================

-- Users table (profile data)
-- Note: This does NOT delete from auth.users (Supabase's auth system)
-- Users will need to sign up again, which will create new profiles
DELETE FROM users;

-- ============================================================================
-- STEP 5: Clean up orphaned storage files (optional - run if needed)
-- ============================================================================

-- Uncomment if you want to delete all uploaded images from storage
-- DELETE FROM storage.objects WHERE bucket_id IN ('pins', 'profiles', 'collections');

-- ============================================================================
-- STEP 6: Re-enable triggers and commit
-- ============================================================================

-- Re-enable triggers
SET session_replication_role = 'default';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after the wipe to verify everything is clean
-- ============================================================================

-- Verify all tables are empty
SELECT
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'collections', COUNT(*) FROM collections
UNION ALL
SELECT 'pins', COUNT(*) FROM pins
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'user_follows', COUNT(*) FROM user_follows
UNION ALL
SELECT 'collection_likes', COUNT(*) FROM collection_likes
UNION ALL
SELECT 'saved_collections', COUNT(*) FROM saved_collections
UNION ALL
SELECT 'feed_activities', COUNT(*) FROM feed_activities
UNION ALL
SELECT 'user_badges', COUNT(*) FROM user_badges
UNION ALL
SELECT 'collection_views', COUNT(*) FROM collection_views
ORDER BY table_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ All user data has been wiped successfully!' as status;
SELECT '🔄 Users will need to sign up again when visiting the app' as next_step;
SELECT '⚠️  Remember: Supabase Auth users still exist - they will create new profiles on first login' as note;
