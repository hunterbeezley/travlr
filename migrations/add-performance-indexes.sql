-- Performance Optimization: Add Database Indexes
-- These indexes dramatically improve query performance for common operations

-- Users table indexes
-- Already has primary key on id, but add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Collections table indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_collections_user_updated ON collections(user_id, updated_at DESC);

-- Pins table indexes
CREATE INDEX IF NOT EXISTS idx_pins_user_id ON pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_collection_id ON pins(collection_id);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_user_created ON pins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pins_collection_created ON pins(collection_id, created_at DESC);

-- Pin images table indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_pin_images_pin_id ON pin_images(pin_id);
CREATE INDEX IF NOT EXISTS idx_pin_images_user_id ON pin_images(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_images_upload_order ON pin_images(pin_id, upload_order);

-- Follows table indexes (for social features)
-- Only run if follows table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
  END IF;
END $$;

-- Collection likes table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_likes') THEN
    CREATE INDEX IF NOT EXISTS idx_collection_likes_collection_id ON collection_likes(collection_id);
    CREATE INDEX IF NOT EXISTS idx_collection_likes_user_id ON collection_likes(user_id);
  END IF;
END $$;

-- Composite indexes for common JOIN patterns
CREATE INDEX IF NOT EXISTS idx_pins_collection_user ON pins(collection_id, user_id);

-- Analyze tables to update statistics (improves query planning)
ANALYZE users;
ANALYZE collections;
ANALYZE pins;

-- Analyze optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pin_images') THEN
    ANALYZE pin_images;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    ANALYZE follows;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_likes') THEN
    ANALYZE collection_likes;
  END IF;
END $$;

-- Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'collections', 'pins', 'pin_images')
ORDER BY tablename, indexname;
