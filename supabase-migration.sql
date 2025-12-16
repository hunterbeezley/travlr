-- Travlr: Secure User Profile Creation
-- Run this in your Supabase SQL Editor

-- Step 1: Create a function that automatically creates a user record
-- This runs with elevated privileges and can't be manipulated by clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just continue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger that fires when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Set up secure RLS policies
-- First, enable RLS if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- NOTE: No INSERT policy - only the trigger can create user records

-- Step 4 (Optional): Backfill existing auth users who don't have user records yet
INSERT INTO public.users (id, email, created_at)
SELECT
  id,
  email,
  created_at
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE public.users.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT
  'Trigger created' as status,
  COUNT(*) as user_count
FROM public.users;
