-- ============================================================================
-- OPTIONAL: Delete Supabase Auth Users
-- ============================================================================
-- This script deletes ALL authentication users from Supabase Auth.
-- Run this ONLY IF you want users to completely re-authenticate.
--
-- If you skip this script, existing users will still have their auth accounts
-- but will need to create new profiles when they log in.
--
-- WARNING: This is DESTRUCTIVE and IRREVERSIBLE!
-- Only run on development/staging, NOT production!
-- ============================================================================

BEGIN;

-- ============================================================================
-- Delete all users from Supabase Auth system
-- ============================================================================

-- Delete from auth.users (this will cascade to auth.identities, auth.sessions, etc.)
-- Note: This requires superuser/service_role privileges
DELETE FROM auth.users;

-- ============================================================================
-- Reset sequences
-- ============================================================================

-- Reset any auth-related sequences if needed
-- ALTER SEQUENCE auth.refresh_tokens_id_seq RESTART WITH 1;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT COUNT(*) as remaining_auth_users FROM auth.users;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '✅ All authentication users have been deleted!' as status;
SELECT '🔄 Users must sign up from scratch (new Google OAuth accounts)' as next_step;
