-- Fix "Collection search error: {}" caused by PostgREST function-overload
-- ambiguity: add-social-feed-phase2.sql created an OLDER 3-arg
-- search_collections(p_query, p_limit, p_offset), and
-- add-search-functionality.sql / fix-search-include-own-collections.sql
-- created a DIFFERENT 5-arg search_collections(search_query,
-- filter_category, filter_location, sort_by, result_limit). Since the
-- argument lists differ, CREATE OR REPLACE never collapsed them into one
-- function - both overloads exist, and PostgREST can't pick a "best
-- candidate" when the app calls search_collections with named params,
-- returning an ambiguity error with sparse/empty fields (the "{}" seen in
-- the browser console).
--
-- The app (src/components/Map.tsx) only ever calls the 5-arg version, so
-- the obsolete 3-arg one is dropped here.

DROP FUNCTION IF EXISTS search_collections(TEXT, INT, INT);
