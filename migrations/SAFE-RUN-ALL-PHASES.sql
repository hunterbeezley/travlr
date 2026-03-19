-- ============================================================================
-- SAFE Migration: Run All Phases (Idempotent)
-- This version drops and recreates indexes to avoid "already exists" errors
-- ============================================================================

-- Drop existing indexes if they exist (safe to run multiple times)
DROP INDEX IF EXISTS idx_user_follows_follower;
DROP INDEX IF EXISTS idx_user_follows_following;
DROP INDEX IF EXISTS idx_collection_likes_collection;
DROP INDEX IF EXISTS idx_collection_likes_user;
DROP INDEX IF EXISTS idx_saved_collections_user;
DROP INDEX IF EXISTS idx_saved_collections_collection;
DROP INDEX IF EXISTS idx_feed_activities_user_created;
DROP INDEX IF EXISTS idx_feed_activities_target;
DROP INDEX IF EXISTS idx_collection_shares_collection;
DROP INDEX IF EXISTS idx_collection_views_collection;
DROP INDEX IF EXISTS idx_collection_views_user;
DROP INDEX IF EXISTS idx_user_badges_user;
DROP INDEX IF EXISTS idx_user_verification_user;
DROP INDEX IF EXISTS idx_user_verification_type;
DROP INDEX IF EXISTS idx_featured_collections_active;
DROP INDEX IF EXISTS idx_featured_collections_placement;
DROP INDEX IF EXISTS idx_collection_analytics_collection;

-- Now run Phase 1 tables (IF NOT EXISTS handles duplicates)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'collection_created', 'collection_updated', 'pin_added',
    'collection_liked', 'collection_saved', 'user_followed', 'comment_added'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('collection', 'pin', 'user', 'comment')),
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_method TEXT NOT NULL CHECK (share_method IN ('link', 'twitter', 'facebook', 'email', 'whatsapp')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('category', 'location', 'user')),
  interest_value TEXT NOT NULL,
  score NUMERIC DEFAULT 1.0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_type, interest_value)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  notify_on_like BOOLEAN DEFAULT true,
  notify_on_save BOOLEAN DEFAULT true,
  notify_on_comment BOOLEAN DEFAULT true,
  notify_on_follow BOOLEAN DEFAULT true,
  notify_on_mention BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'creator_starter', 'creator_bronze', 'creator_silver', 'creator_gold',
    'explorer_bronze', 'explorer_silver', 'explorer_gold',
    'social_butterfly', 'trendsetter', 'local_expert',
    'verified_creator', 'early_adopter', 'beta_tester'
  )),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_type)
);

CREATE TABLE IF NOT EXISTS user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'creator', 'local_expert', 'business', 'staff'
  )),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES users(id),
  verification_notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS featured_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  featured_by UUID NOT NULL REFERENCES users(id),
  featured_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  priority INT DEFAULT 0,
  featured_reason TEXT,
  placement TEXT DEFAULT 'feed' CHECK (placement IN ('feed', 'explore', 'homepage', 'category')),
  category TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS collection_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS collection_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE UNIQUE,
  total_views INT DEFAULT 0,
  total_likes INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  total_shares INT DEFAULT 0,
  total_comments INT DEFAULT 0,
  unique_viewers INT DEFAULT 0,
  avg_view_duration_seconds NUMERIC,
  last_view_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create all indexes (fresh)
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id, created_at DESC);
CREATE INDEX idx_collection_likes_collection ON collection_likes(collection_id);
CREATE INDEX idx_collection_likes_user ON collection_likes(user_id, created_at DESC);
CREATE INDEX idx_saved_collections_user ON saved_collections(user_id, created_at DESC);
CREATE INDEX idx_saved_collections_collection ON saved_collections(collection_id);
CREATE INDEX idx_feed_activities_user_created ON feed_activities(user_id, created_at DESC);
CREATE INDEX idx_feed_activities_target ON feed_activities(target_type, target_id, created_at DESC);
CREATE INDEX idx_collection_shares_collection ON collection_shares(collection_id);
CREATE INDEX idx_collection_views_collection ON collection_views(collection_id, viewed_at DESC);
CREATE INDEX idx_collection_views_user ON collection_views(user_id, viewed_at DESC);
CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_verification_user ON user_verification(user_id);
CREATE INDEX idx_user_verification_type ON user_verification(verification_type) WHERE is_active = true;
CREATE INDEX idx_featured_collections_active ON featured_collections(is_active, priority DESC, featured_at DESC);
CREATE INDEX idx_featured_collections_placement ON featured_collections(placement, is_active) WHERE is_active = true;
CREATE INDEX idx_collection_analytics_collection ON collection_analytics(collection_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All tables and indexes created successfully!';
  RAISE NOTICE 'Now run the function migrations from each phase file.';
END $$;
