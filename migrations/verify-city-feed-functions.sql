-- Verification Script: Check if city feed functions exist and work
-- Part of Issue #29 - City-based discovery feed
--
-- Run this to verify the migration was applied correctly

-- =============================================================================
-- 1. Check if location columns exist on pins table
-- =============================================================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pins'
  AND column_name IN ('city', 'state', 'country', 'country_code')
ORDER BY column_name;

-- Expected: Should return 4 rows (city, country, country_code, state)

-- =============================================================================
-- 2. Check if RPC functions exist
-- =============================================================================
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_collection_primary_city',
    'get_collections_by_city',
    'get_cities_with_collections'
  )
ORDER BY routine_name;

-- Expected: Should return 3 rows (one for each function)

-- =============================================================================
-- 3. Test get_cities_with_collections function
-- =============================================================================
SELECT * FROM get_cities_with_collections();

-- Expected: Should return cities with collection counts
-- If empty: No collections have pins with city data yet

-- =============================================================================
-- 4. Check sample of pins with city data
-- =============================================================================
SELECT
  id,
  title,
  city,
  state,
  country,
  country_code
FROM pins
WHERE city IS NOT NULL
LIMIT 5;

-- Expected: Should show pins with location data
-- If empty: Run backfill script to populate city data

-- =============================================================================
-- 5. Test get_collections_by_city for a specific city
-- =============================================================================
-- Replace 'Portland' with a city from step 3 results
SELECT * FROM get_collections_by_city('Portland', 'popular', 10, 0, false);

-- Expected: Should return collections from Portland
-- If error: Check function definition and RLS policies
-- If empty: No public collections in Portland yet

-- =============================================================================
-- 6. Check RLS policies on collection_votes
-- =============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('collection_votes', 'collection_comments')
ORDER BY tablename, policyname;

-- Expected: Should show RLS policies for voting and comments

-- =============================================================================
-- TROUBLESHOOTING
-- =============================================================================
-- If columns don't exist (step 1):
--   Run: migrations/add-city-location-fields.sql

-- If functions don't exist (step 2):
--   The migration wasn't applied. Run the migration file.

-- If step 3 returns empty but step 4 has data:
--   Issue with get_cities_with_collections function
--   Check for errors in function execution

-- If step 4 returns empty:
--   Run: npx tsx scripts/backfill-pin-cities.ts
--   This will populate city data from Google Places API

-- If step 5 gives permission error:
--   Check RLS policies and GRANT statements in migration
