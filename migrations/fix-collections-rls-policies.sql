-- Fix RLS policies for collections table
-- This ensures users can manage their own collections and view public ones

-- Enable RLS on collections table (if not already enabled)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can view public collections" ON collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

-- Policy: Users can view their own collections
CREATE POLICY "Users can view their own collections"
ON collections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can view public collections
CREATE POLICY "Users can view public collections"
ON collections FOR SELECT
TO authenticated
USING (is_public = true);

-- Policy: Users can insert their own collections
CREATE POLICY "Users can insert their own collections"
ON collections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own collections
CREATE POLICY "Users can update their own collections"
ON collections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own collections
CREATE POLICY "Users can delete their own collections"
ON collections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'collections';
