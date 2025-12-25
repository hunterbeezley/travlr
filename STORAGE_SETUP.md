# Supabase Storage Setup Guide

This guide walks you through setting up Supabase Storage for Travlr's image uploads (profile pictures and pin images).

## Why You Need This

The app uses Supabase Storage to store:
- Profile pictures
- Pin images (single or multiple per pin)

Without proper storage setup, image uploads will fail with empty error messages.

## Setup Steps

### 1. Create the Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `travlr-images`
   - **Public bucket**: ✅ **Enable** (check the box)
   - **File size limit**: 5MB (optional, you can increase this)
   - **Allowed MIME types**: Leave empty or add: `image/jpeg`, `image/png`, `image/webp`
5. Click **Create bucket**

### 2. Set Up Storage Policies (RLS)

By default, Supabase Storage has Row Level Security (RLS) enabled. You need to create policies to allow authenticated users to upload and access images.

#### Option A: Using the Dashboard (Easiest)

1. In the **Storage** section, click on your `travlr-images` bucket
2. Go to the **Policies** tab
3. Click **New policy**

**Policy 1: Allow authenticated users to upload to their own folder**
- Policy name: `Users can upload to own folder`
- Allowed operation: `INSERT`
- Policy definition:
```sql
(bucket_id = 'travlr-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
```

**Policy 2: Allow public read access**
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Policy definition:
```sql
bucket_id = 'travlr-images'::text
```

**Policy 3: Allow users to delete their own images**
- Policy name: `Users can delete own images`
- Allowed operation: `DELETE`
- Policy definition:
```sql
(bucket_id = 'travlr-images'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
```

#### Option B: Using SQL (Advanced)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'travlr-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'travlr-images');

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'travlr-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'travlr-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
```

### 3. Verify the Setup

1. Navigate to `/test-images` in your running app (http://localhost:3000/test-images)
2. Click **Test Storage Connection** - should show ✅ success
3. Try uploading a test image - should work!

## How It Works

The storage structure looks like this:
```
travlr-images/
├── [user-id-1]/
│   ├── profiles/
│   │   └── 1234567890.jpg
│   └── pins/
│       ├── 1234567891.jpg
│       └── 1234567892.jpg
├── [user-id-2]/
│   ├── profiles/
│   │   └── 1234567893.jpg
│   └── pins/
│       └── 1234567894.jpg
```

Each user uploads to their own folder (identified by their user ID), which prevents users from accidentally or maliciously deleting other users' images.

## Troubleshooting

### "Upload error: {}" or empty error
- The bucket doesn't exist or is named incorrectly (must be exactly `travlr-images`)
- The bucket is not public
- RLS policies are missing or incorrect

### "Permission denied" errors
- RLS policies are too restrictive
- User is not authenticated
- Check that the policy definitions match your bucket name

### Images not displaying
- Check that the bucket is set to **Public**
- Verify the `SELECT` policy allows public read access
- Check browser console for CORS errors (shouldn't happen with Supabase, but worth checking)

### Large images failing to upload
- Default limit is 5MB
- Check browser console for size validation errors
- Images are automatically resized before upload (profiles to 400px, pins keep original size)

## Security Notes

- The RLS policies ensure users can only upload/delete images in their own folder
- Public read access is safe because the bucket only contains user-uploaded content images
- File size limits are enforced client-side (5MB) to prevent abuse
- Only JPEG, PNG, and WebP formats are allowed

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase credentials in `.env.local`
3. Make sure you're signed in when testing uploads
4. Try the test page at `/test-images` to diagnose issues
