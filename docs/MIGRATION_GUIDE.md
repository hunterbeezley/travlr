# Migration Guide for Bug Fixes

## Issues Fixed
- **#91**: "For You" tab error - `Error loading suggestions: {}` + `column reference "user_id" is ambiguous`
- **#94**: Following a user results in error:
  - `record "new" has no field "user_id"` (code 42703)
  - `column "link" of relation "notifications" does not exist` (code 42703)

## Root Cause
1. Required database functions don't exist in production database
2. **CRITICAL**: The `check_badge_achievements()` trigger function tries to access `NEW.user_id` on the `user_follows` table, which doesn't have that field
3. **CRITICAL**: The `notifications` table is missing a `link` column that triggers try to insert into
4. **CRITICAL**: The `get_following_suggestions()` function has ambiguous `user_id` column references in JOIN

The code now has fallback logic for missing functions, but these database bugs must be fixed.

## Required Migrations

### 1. Fix Badge Achievements Function (CRITICAL - MUST RUN FIRST)

**File:** `migrations/fix-check-badge-achievements-function.sql`

**What it does:**
- Fixes the `check_badge_achievements()` trigger function
- The function was trying to access `NEW.user_id` on all tables
- Now correctly checks which table triggered it before accessing fields
- Prevents "record 'new' has no field 'user_id'" error

**How to apply:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire contents of `migrations/fix-check-badge-achievements-function.sql`
4. Paste and run in SQL Editor
5. Verify: Should see "Success" message

**IMPORTANT**: Run this BEFORE trying to follow users, otherwise you'll get the field error.

### 2. Fix Notifications and Suggestions (CRITICAL - MUST RUN SECOND)

**File:** `migrations/fix-notifications-and-suggestions.sql`

**What it does:**
- Adds missing `link` column to `notifications` table
- Fixes ambiguous `user_id` reference in `get_following_suggestions()` function
- Changes all internal CTEs to use `suggested_user_id` instead of `user_id`
- Prevents column reference ambiguity errors

**How to apply:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire contents of `migrations/fix-notifications-and-suggestions.sql`
4. Paste and run in SQL Editor
5. Verify: Should see "Success" message

**IMPORTANT**: Run this BEFORE trying to follow users, otherwise triggers will fail on the missing `link` column.

### 4. Social Feed Phase 1 (For follow system - OPTIONAL if already applied)

**File:** `migrations/add-social-feed-phase1.sql`

**What it does:**
- Creates `user_follows` table with RLS policies
- Creates `follow_user()` and `unfollow_user()` RPC functions
- Creates indexes for performance

**Note:** You likely already applied this. Skip if it errors with "already exists".

### 5. Social Feed Phase 4 (For user suggestions - OPTIONAL)

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

Apply migrations in this exact order:
1. **fix-check-badge-achievements-function.sql** (CRITICAL - fixes badge trigger)
2. **fix-notifications-and-suggestions.sql** (CRITICAL - adds link column, fixes ambiguous user_id)
3. Phase 1 (follow system) - skip if already applied
4. Phase 2 (collections feed) - optional
5. Phase 3 (notifications) - optional
6. Phase 4 (suggestions) - optional, fixes #91
7. Phase 5 (advanced features) - optional

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
