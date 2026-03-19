# How to Run Social Feed Migrations

## Quick Start

Run each migration file in order via Supabase SQL Editor:

**Dashboard URL**: https://supabase.com/dashboard/project/amcvauzaplpftsgnhwrb/sql

---

## Step-by-Step

### 1. Phase 1 - Core Social Features

1. Click "New query" in SQL Editor
2. Copy entire contents of: `migrations/add-social-feed-phase1.sql`
3. Paste and click "Run"
4. ✅ Should see "Success. No rows returned"

**What this adds**:
- Following/followers system
- Collection likes and saves
- Feed activities tracking
- RPC functions: `follow_user`, `like_collection`, `save_collection`, `get_user_feed`

---

### 2. Phase 2 - Discovery

1. Click "New query"
2. Copy entire contents of: `migrations/add-social-feed-phase2.sql`
3. Paste and click "Run"
4. ✅ Should see success

**What this adds**:
- Trending collections algorithm
- Nearby collections (geolocation)
- Search functionality
- Category and city browsing
- RPC functions: `get_trending_collections`, `get_nearby_collections`, `search_collections`

---

### 3. Phase 3 - Engagement

1. Click "New query"
2. Copy entire contents of: `migrations/add-social-feed-phase3.sql`
3. Paste and click "Run"
4. ✅ Should see success

**What this adds**:
- Share tracking
- Folder organization for saved collections
- Notification triggers
- RPC functions: `track_collection_share`, `organize_saved_collection`

---

### 4. Phase 4 - Personalization

1. Click "New query"
2. Copy entire contents of: `migrations/add-social-feed-phase4.sql`
3. Paste and click "Run"
4. ✅ Should see success

**What this adds**:
- User interests tracking (auto-learning)
- Following suggestions
- "For You" personalized feed
- Notification preferences
- RPC functions: `get_following_suggestions`, `get_for_you_feed`

---

### 5. Phase 5 - Polish & Analytics

1. Click "New query"
2. Copy entire contents of: `migrations/add-social-feed-phase5.sql`
3. Paste and click "Run"
4. ✅ Should see success

**What this adds**:
- Collection analytics and view tracking
- Badge system (gamification)
- User verification
- Featured collections
- Advanced search filters
- RPC functions: `get_user_analytics`, `get_collection_analytics`, `search_collections_advanced`

---

## Verify Installation

After running all 5 migrations, verify with this query:

```sql
-- Check that all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%follow%'
  OR table_name LIKE '%feed%'
  OR table_name LIKE '%badge%'
ORDER BY table_name;
```

Expected tables:
- `collection_analytics`
- `collection_likes`
- `collection_shares`
- `collection_views`
- `feed_activities`
- `featured_collections`
- `notification_preferences`
- `saved_collections`
- `user_badges`
- `user_follows`
- `user_interests`
- `user_verification`

## Troubleshooting

### Error: "function already exists"
✅ This is fine - skip to next phase

### Error: "relation already exists"
✅ This is fine - skip to next phase

### Error: "permission denied"
❌ Make sure you're using the Supabase dashboard (auto-authenticated)

### Error: "syntax error"
❌ Make sure you copied the ENTIRE file contents
❌ Make sure you didn't accidentally copy HTML/markdown formatting

## After Migration

### Test the Features

1. **Refresh your app** at http://localhost:3000
2. Go to `/feed` - should load without errors (may be empty)
3. Go to `/explore` - should show collections
4. Go to `/analytics` - should show your creator stats
5. Try following a user
6. Try liking/saving a collection

### Empty Feed?

**Yes, this is normal!** Existing collections won't show up in the feed because:
- Activity records only track NEW actions (likes, saves, follows, etc.)
- Old collections weren't tracked in `feed_activities`

To populate your feed:
1. Create a new collection
2. Like/save someone's collection
3. Follow a user
4. These actions will appear in your feed

The feed will populate as you and others use the new features!

---

## Need Help?

If you get stuck:
1. Check the Supabase logs in dashboard
2. Verify your Supabase project ID matches: `amcvauzaplpftsgnhwrb`
3. Make sure you have admin access to the project
