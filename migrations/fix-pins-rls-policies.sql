-- Fix RLS policies for pins table
-- This ensures users can insert, read, update, and delete their own pins

-- Enable RLS on pins table (if not already enabled)
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pins" ON pins;
DROP POLICY IF EXISTS "Users can view pins from public collections" ON pins;
DROP POLICY IF EXISTS "Users can insert their own pins" ON pins;
DROP POLICY IF EXISTS "Users can update their own pins" ON pins;
DROP POLICY IF EXISTS "Users can delete their own pins" ON pins;

-- Policy: Users can view their own pins
CREATE POLICY "Users can view their own pins"
ON pins FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can view pins from public collections
CREATE POLICY "Users can view pins from public collections"
ON pins FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = pins.collection_id
    AND collections.is_public = true
  )
);

-- Policy: Users can insert their own pins
CREATE POLICY "Users can insert their own pins"
ON pins FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pins
CREATE POLICY "Users can update their own pins"
ON pins FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own pins
CREATE POLICY "Users can delete their own pins"
ON pins FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'pins';
