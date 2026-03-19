-- Add comment reporting system
-- This migration adds the ability for users to report inappropriate comments

-- =============================================================================
-- 1. Create comment_reports table
-- =============================================================================
CREATE TABLE IF NOT EXISTS comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES collection_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Prevent duplicate reports from same user on same comment
  UNIQUE(comment_id, reporter_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- Enable RLS
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. RLS Policies
-- =============================================================================

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view their own reports" ON comment_reports;
CREATE POLICY "Users can view their own reports"
  ON comment_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Users can create reports
DROP POLICY IF EXISTS "Users can create reports" ON comment_reports;
CREATE POLICY "Users can create reports"
  ON comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Only moderators/admins can update reports (for future admin panel)
-- For now, no one can update through RLS, updates must be done via admin SQL
DROP POLICY IF EXISTS "No direct updates allowed" ON comment_reports;
CREATE POLICY "No direct updates allowed"
  ON comment_reports FOR UPDATE
  TO authenticated
  USING (false);

-- =============================================================================
-- 3. Function to check if user has already reported a comment
-- =============================================================================
CREATE OR REPLACE FUNCTION has_user_reported_comment(
  p_comment_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM comment_reports
    WHERE comment_id = p_comment_id
      AND reporter_id = p_user_id
  );
END;
$$;

-- =============================================================================
-- 4. Function to get report count for a comment
-- =============================================================================
CREATE OR REPLACE FUNCTION get_comment_report_count(p_comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO report_count
  FROM comment_reports
  WHERE comment_id = p_comment_id
    AND status IN ('pending', 'reviewed'); -- Don't count dismissed/resolved

  RETURN report_count;
END;
$$;

-- =============================================================================
-- 5. Function to create a comment report
-- =============================================================================
CREATE OR REPLACE FUNCTION report_comment(
  p_comment_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  report_id UUID;
BEGIN
  -- Check if user has already reported this comment
  IF has_user_reported_comment(p_comment_id, auth.uid()) THEN
    RAISE EXCEPTION 'You have already reported this comment';
  END IF;

  -- Validate reason
  IF p_reason NOT IN ('spam', 'harassment', 'inappropriate', 'other') THEN
    RAISE EXCEPTION 'Invalid report reason';
  END IF;

  -- Create the report
  INSERT INTO comment_reports (
    comment_id,
    reporter_id,
    reason,
    details
  ) VALUES (
    p_comment_id,
    auth.uid(),
    p_reason,
    p_details
  )
  RETURNING id INTO report_id;

  RETURN report_id;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION has_user_reported_comment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_reported_comment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_report_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_comment(UUID, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- Add comments
-- =============================================================================
COMMENT ON TABLE comment_reports IS
'Stores reports of inappropriate comments from users';

COMMENT ON FUNCTION has_user_reported_comment IS
'Check if a user has already reported a specific comment';

COMMENT ON FUNCTION get_comment_report_count IS
'Get the number of pending/reviewed reports for a comment';

COMMENT ON FUNCTION report_comment IS
'Create a report for an inappropriate comment';
