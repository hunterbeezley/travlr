# Migration Guide for Bug Fixes

## Issues Fixed
- **#91**: "For You" tab error - `Error loading suggestions: {}`
- **#94**: Following a user results in error

## Root Cause
These errors occur because required database functions don't exist in your production database yet. The code now has fallback logic, but for best performance, you should apply these migrations.

## Required Migrations

### 1. Social Feed Phase 1 (CRITICAL - Required for follow/unfollow)

**File:** `migrations/add-social-feed-phase1.sql`

**What it does:**
- Creates `user_follows` table with RLS policies
- Creates `follow_user()` and `unfollow_user()` RPC functions
- Creates indexes for performance

**How to apply:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire contents of `migrations/add-social-feed-phase1.sql`
4. Paste and run in SQL Editor
5. Verify: Should see "Success" message

### 2. Social Feed Phase 4 (For user suggestions)

**File:** `migrations/add-social-feed-phase4.sql`

**What it does:**
- Creates `get_following_suggestions()` RPC function
- Suggests users based on mutual connections and interests

**How to apply:**
1. Same process as Phase 1
2. Copy contents of `migrations/add-social-feed-phase4.sql`
3. Run in SQL Editor

## Verification

After applying migrations, test:

1. **Follow/Unfollow:**
   - Go to `/friends` page
   - Try following a user
   - Should work without errors

2. **For You Feed:**
   - Go to home page `/`
   - Click "For You" tab
   - Should see user suggestions without errors

## Fallback Behavior

Even without these migrations, the app will work using fallback logic:

- **Follow/Unfollow:** Direct database inserts/deletes to `user_follows` table
- **Suggestions:** Random users from database instead of smart suggestions

The fallbacks are slower and less intelligent, but functional.

## Order Matters

Apply migrations in this order:
1. Phase 1 (follow system)
2. Phase 2 (collections feed) - if needed
3. Phase 3 (notifications) - if needed
4. Phase 4 (suggestions) - fixes #91
5. Phase 5 (advanced features) - optional

## Troubleshooting

### Error: "function already exists"
- Migration already applied, safe to skip

### Error: "relation user_follows does not exist"
- Run Phase 1 first

### Error: "permission denied"
- Check you're using the service role key in SQL Editor
- Or use "postgres" role in Supabase Dashboard

### Still getting errors?
- Check browser console for exact error
- Verify auth session is valid
- Try logging out and back in

## Quick Test Query

Run this in SQL Editor to check if functions exist:

```sql
-- Check if follow functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('follow_user', 'unfollow_user', 'get_following_suggestions');
```

Should return all three function names if migrations applied successfully.

---

**Note:** The app now has fallback logic, so these errors shouldn't break functionality. But applying migrations will improve performance and user experience.
