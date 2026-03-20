# Database Migrations

This directory contains SQL migration files for the Travlr database.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute in the SQL Editor

### Option 2: Command Line (if you have psql and connection string)

```bash
psql "your-database-url" -f migrations/migration-file.sql
```

## Recent Migrations

### add-search-functionality.sql
**Date:** 2026-03-20
**Purpose:** Add full-text search capabilities for collections and users

**Features:**
- Adds `search_vector` tsvector column to collections and users tables
- Creates GIN indexes for fast full-text search
- Adds automatic triggers to maintain search vectors
- Creates RPC functions: `search_collections()` and `search_users()`
- Supports filtering by category and location for collections
- Supports sorting by relevance, recent, or popularity

**To Apply:**
Copy the contents of `add-search-functionality.sql` and execute in Supabase SQL Editor.

**Rollback:** (if needed)
```sql
DROP FUNCTION IF EXISTS search_collections;
DROP FUNCTION IF EXISTS search_users;
DROP TRIGGER IF EXISTS collections_search_vector_update ON collections;
DROP TRIGGER IF EXISTS users_search_vector_update ON users;
DROP FUNCTION IF EXISTS update_collections_search_vector;
DROP FUNCTION IF EXISTS update_users_search_vector;
DROP INDEX IF EXISTS collections_search_idx;
DROP INDEX IF EXISTS users_search_idx;
DROP INDEX IF EXISTS collections_location_idx;
DROP INDEX IF EXISTS collections_category_idx;
ALTER TABLE collections DROP COLUMN IF EXISTS search_vector;
ALTER TABLE users DROP COLUMN IF EXISTS search_vector;
```
