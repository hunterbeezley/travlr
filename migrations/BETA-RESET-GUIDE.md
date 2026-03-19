# Beta Testing Database Reset Guide

## Overview

This guide explains how to completely wipe your database before giving access to beta testers, ensuring they start with a clean slate.

## ⚠️ IMPORTANT WARNINGS

- **DESTRUCTIVE OPERATION**: These scripts delete ALL user data
- **IRREVERSIBLE**: There is no undo - data will be permanently lost
- **PRODUCTION WARNING**: NEVER run these on production databases
- **Backup First**: Always backup your database before running these scripts

## 🎯 What Gets Deleted

### User Data
- User profiles and settings
- All collections created by users
- All pins saved by users
- Comments and votes
- Social connections (follows, likes, saves)
- Feed activities
- Notifications
- Analytics data
- GDPR consent records

### What Is Preserved
- Database schema and structure
- All tables, columns, and indexes
- RPC functions and triggers
- Row-Level Security (RLS) policies

## 📋 Step-by-Step Instructions

### Option 1: Keep Auth Users (Recommended for Beta)

Users will keep their authentication accounts but get fresh profiles.

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to "SQL Editor"

2. **Run the Data Wipe Script**
   ```sql
   -- Copy and paste contents of WIPE-ALL-USER-DATA.sql
   ```

3. **Verify the Wipe**
   - Run the verification queries at the end of the script
   - All counts should be 0

4. **Deploy to Vercel**
   - Existing users can log back in with Google
   - They'll be prompted to complete profile setup again
   - All their previous data is gone

### Option 2: Complete Reset (Including Auth)

Users must sign up completely fresh.

1. **Run the Data Wipe Script First**
   ```sql
   -- Copy and paste contents of WIPE-ALL-USER-DATA.sql
   ```

2. **Run the Auth Wipe Script** (OPTIONAL)
   ```sql
   -- Copy and paste contents of WIPE-AUTH-USERS-OPTIONAL.sql
   ```

3. **Verify Everything**
   - Check both profile and auth user counts
   - Both should be 0

4. **Deploy to Vercel**
   - Users must sign up as if they've never used the app
   - Even if they logged in before, they'll be new users

## 🔄 After Running the Scripts

### What Happens on First Login

**If you kept auth users (Option 1):**
- User logs in with Google (existing account works)
- System detects no profile exists
- Profile completion modal appears
- User creates fresh profile
- Can start using app with clean slate

**If you deleted auth users (Option 2):**
- User must sign up via Google OAuth
- Completely new authentication
- Profile setup happens as new user
- Fresh start from scratch

### Testing Checklist

After wiping and deploying, verify:
- [ ] Users can sign up with Google
- [ ] Profile completion modal appears
- [ ] Users can create collections
- [ ] Users can add pins
- [ ] Map shows pins correctly
- [ ] Feed is empty (no previous activity)
- [ ] Explore page shows no collections
- [ ] Saved page is empty

## 🗄️ Storage Cleanup (Optional)

The scripts do NOT delete uploaded images from Supabase Storage.

To clean up storage:

1. Go to **Supabase Dashboard → Storage**
2. Check these buckets:
   - `pins` (pin images)
   - `profiles` (profile avatars)
   - `collections` (collection thumbnails)
3. Delete contents or entire bucket contents

Or run this SQL:
```sql
DELETE FROM storage.objects
WHERE bucket_id IN ('pins', 'profiles', 'collections');
```

## 🚀 Recommended Workflow for Beta

1. **Backup** - Take a snapshot of your current database
2. **Test Locally** - Run wipe scripts on local/dev database first
3. **Verify** - Ensure everything works correctly
4. **Run on Staging** - Wipe your staging/beta database
5. **Deploy** - Deploy to Vercel
6. **Share** - Give beta link to testers
7. **Monitor** - Watch for any issues with fresh signups

## 🐛 Troubleshooting

### "Permission denied" errors
- Make sure you're using a service_role key or superuser
- Some operations require elevated permissions

### "Foreign key constraint" errors
- The scripts are ordered to handle dependencies
- If you get this error, tables may be deleted out of order

### Users can't sign up
- Check your Google OAuth configuration
- Verify Supabase Auth settings
- Check RLS policies are still in place

### Profile completion modal doesn't appear
- Check `useAuth` hook is working
- Verify profile creation logic in Auth component
- Check browser console for errors

## 📝 Quick Reference

```bash
# Location of wipe scripts
migrations/WIPE-ALL-USER-DATA.sql          # Main data wipe
migrations/WIPE-AUTH-USERS-OPTIONAL.sql    # Auth user wipe (optional)

# Run in Supabase SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy/paste script contents
4. Click "Run"
5. Check results
```

## ✅ Success Indicators

After running scripts, you should see:
- ✅ All verification queries return 0 counts
- ✅ Users table is empty
- ✅ Collections table is empty
- ✅ Pins table is empty
- ✅ Feed tables are empty
- ✅ No errors in script execution

## 🎉 Ready for Beta!

Once you've completed the wipe:
1. Deploy to Vercel
2. Test signup yourself
3. Create a test pin/collection
4. Verify everything works
5. Share link with beta testers

**Beta testers will experience:**
- Fresh, empty app
- No existing data clutter
- Clean signup flow
- Ability to create first collections/pins
- Real "day one" experience

---

**Remember**: Always backup before wiping, and never run these scripts on production data!
