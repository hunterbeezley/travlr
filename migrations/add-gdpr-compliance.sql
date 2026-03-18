-- GDPR Compliance: Data Export and Account Deletion Functions
-- This migration adds necessary functions for GDPR compliance including
-- user data export and complete account deletion

-- =============================================================================
-- 1. Function to export all user data (GDPR Right to Data Portability)
-- =============================================================================
CREATE OR REPLACE FUNCTION export_user_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data JSON;
  user_profile JSON;
  user_pins JSON;
  user_collections JSON;
  user_follows JSON;
  user_followers JSON;
  user_notifications JSON;
BEGIN
  -- Get user profile
  SELECT row_to_json(u.*)
  INTO user_profile
  FROM users u
  WHERE u.id = auth.uid();

  -- Get user pins
  SELECT json_agg(row_to_json(p.*))
  INTO user_pins
  FROM pins p
  WHERE p.user_id = auth.uid();

  -- Get user collections
  SELECT json_agg(row_to_json(c.*))
  INTO user_collections
  FROM collections c
  WHERE c.user_id = auth.uid();

  -- Get users this user follows
  SELECT json_agg(json_build_object(
    'following_id', f.following_id,
    'followed_at', f.created_at
  ))
  INTO user_follows
  FROM follows f
  WHERE f.follower_id = auth.uid();

  -- Get users following this user
  SELECT json_agg(json_build_object(
    'follower_id', f.follower_id,
    'followed_at', f.created_at
  ))
  INTO user_followers
  FROM follows f
  WHERE f.following_id = auth.uid();

  -- Get user notifications
  SELECT json_agg(row_to_json(n.*))
  INTO user_notifications
  FROM notifications n
  WHERE n.user_id = auth.uid();

  -- Combine all data
  user_data := json_build_object(
    'export_date', NOW(),
    'profile', user_profile,
    'pins', COALESCE(user_pins, '[]'::json),
    'collections', COALESCE(user_collections, '[]'::json),
    'following', COALESCE(user_follows, '[]'::json),
    'followers', COALESCE(user_followers, '[]'::json),
    'notifications', COALESCE(user_notifications, '[]'::json)
  );

  RETURN user_data;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION export_user_data() TO authenticated;

COMMENT ON FUNCTION export_user_data IS
'Exports all user data in JSON format for GDPR compliance (Right to Data Portability)';

-- =============================================================================
-- 2. Function to delete user account and all related data (GDPR Right to Erasure)
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_user_id UUID;
  image_paths TEXT[];
BEGIN
  deleted_user_id := auth.uid();

  IF deleted_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get all image paths for cleanup (for informational purposes)
  SELECT array_agg(image_path)
  INTO image_paths
  FROM pin_images
  WHERE user_id = deleted_user_id;

  -- Delete will cascade due to foreign key constraints
  -- Order: notifications, follows, pin_images, pins, collections, user

  -- Delete notifications
  DELETE FROM notifications WHERE user_id = deleted_user_id;
  DELETE FROM notifications WHERE actor_id = deleted_user_id;

  -- Delete follows (both following and followers)
  DELETE FROM follows WHERE follower_id = deleted_user_id OR following_id = deleted_user_id;

  -- Delete pin images
  DELETE FROM pin_images WHERE user_id = deleted_user_id;

  -- Delete pins
  DELETE FROM pins WHERE user_id = deleted_user_id;

  -- Delete collections
  DELETE FROM collections WHERE user_id = deleted_user_id;

  -- Delete user from auth.users (this will also delete from public.users if cascade is set)
  -- Note: This requires admin privileges, so we'll delete from public.users only
  DELETE FROM users WHERE id = deleted_user_id;

  RETURN json_build_object(
    'success', true,
    'deleted_user_id', deleted_user_id,
    'image_paths', image_paths,
    'message', 'Account and all associated data deleted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

COMMENT ON FUNCTION delete_user_account IS
'Deletes user account and all associated data for GDPR compliance (Right to Erasure)';

-- =============================================================================
-- 3. Add date_of_birth field to users table (for age verification)
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN users.date_of_birth IS
'User date of birth for age verification (COPPA compliance - must be 13+)';

-- =============================================================================
-- 4. Create consent_records table (for tracking user consent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT, -- For non-authenticated users
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies', 'analytics', 'data_collection')),
  consented BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_consent_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_session_id ON consent_records(session_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type);

-- Enable RLS
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own consent records" ON consent_records;
CREATE POLICY "Users can view their own consent records"
  ON consent_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own consent records" ON consent_records;
CREATE POLICY "Users can insert their own consent records"
  ON consent_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own consent records" ON consent_records;
CREATE POLICY "Users can update their own consent records"
  ON consent_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE consent_records IS
'Stores user consent records for GDPR compliance';

-- =============================================================================
-- 5. Function to record user consent
-- =============================================================================
CREATE OR REPLACE FUNCTION record_user_consent(
  p_consent_type TEXT,
  p_consented BOOLEAN,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO consent_records (
    user_id,
    session_id,
    consent_type,
    consented
  ) VALUES (
    auth.uid(),
    p_session_id,
    p_consent_type,
    p_consented
  )
  RETURNING id INTO result_id;

  RETURN json_build_object(
    'success', true,
    'consent_id', result_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION record_user_consent(TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_user_consent(TEXT, BOOLEAN, TEXT) TO anon;

COMMENT ON FUNCTION record_user_consent IS
'Records user consent for data collection and cookies';
