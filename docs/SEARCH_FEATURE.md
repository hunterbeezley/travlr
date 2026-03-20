# Search Feature Documentation

**Status:** ✅ Implemented (needs database migration)
**Issue:** #83
**Priority:** 🟡 P1 - Critical for discoverability

## Overview

Comprehensive search functionality that allows users to discover public collections and find other travelers across the platform.

## Features

### Collection Search
- **Full-text search** - Search by title, description, location
- **Category filtering** - Filter by Food & Drink, Nature, Culture, Adventure, Urban
- **Location filtering** - Find collections in specific cities or countries
- **Sorting options**:
  - Most Relevant (default) - Uses PostgreSQL ts_rank
  - Most Recent - Newest collections first
  - Most Popular - By pin count

### User Search
- **Find users** - Search by username, display name, or bio
- **User stats** - Shows follower count and collection count
- **Follow directly** - Follow/unfollow users from search results
- **Profile preview** - See bio, location, and stats before clicking

### UI/UX
- **Global search** - Accessible from navbar (desktop and mobile)
- **Tabbed interface** - Switch between Collections and Users
- **Real-time search** - 300ms debounced for smooth experience
- **Empty states** - Helpful messaging when no results found
- **Mobile optimized** - Responsive design for all screen sizes

## Technical Implementation

### Database Schema

#### Collections Table
```sql
ALTER TABLE collections ADD COLUMN search_vector tsvector;
CREATE INDEX collections_search_idx ON collections USING GIN(search_vector);
```

#### Users Table
```sql
ALTER TABLE users ADD COLUMN search_vector tsvector;
CREATE INDEX users_search_idx ON users USING GIN(search_vector);
```

### Search Vectors

Search vectors are automatically maintained via triggers:
- **Collections**: `title` (weight A) + `description` (weight B) + `location` (weight C)
- **Users**: `username` (weight A) + `full_name` (weight A) + `bio` (weight B)

### RPC Functions

#### `search_collections()`
```sql
search_collections(
  search_query TEXT,
  filter_category TEXT DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  result_limit INT DEFAULT 50
)
```

Returns: Collections with pin counts and relevance rank

#### `search_users()`
```sql
search_users(
  search_query TEXT,
  result_limit INT DEFAULT 50
)
```

Returns: Users with follower/collection counts and relevance rank

### Performance

- **GIN Indexes** - Sub-100ms full-text search on large datasets
- **Debouncing** - 300ms delay prevents excessive queries
- **Limit 50** - Default result limit for fast rendering
- **Combined queries** - Single RPC call fetches all data + counts

## Setup Instructions

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
1. Open your Supabase project
2. Go to SQL Editor
3. Copy contents of `migrations/add-search-functionality.sql`
4. Execute the SQL

**Option B: Command Line**
```bash
psql "your-database-url" -f migrations/add-search-functionality.sql
```

### 2. Verify Migration

Check that indexes were created:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('collections', 'users')
AND indexname LIKE '%search%';
```

Should return:
- `collections_search_idx`
- `users_search_idx`

### 3. Test Search Functions

```sql
-- Test collection search
SELECT * FROM search_collections('tokyo', NULL, NULL, 'relevance', 10);

-- Test user search
SELECT * FROM search_users('john', 10);
```

## Usage

### Navigate to Search
- Click **SEARCH** in navbar (desktop)
- Tap **🔍 Search** in bottom nav (mobile)
- Or visit `/search` directly

### Search Collections
1. Enter search term (e.g., "coffee shops in paris")
2. Optionally filter by category (e.g., Food & Drink)
3. Optionally filter by location (e.g., "paris")
4. Choose sort order (Relevance, Recent, Popular)
5. Click any collection to view details

### Search Users
1. Switch to **Users** tab
2. Enter search term (username or name)
3. View user stats and bio
4. Click **Follow** to follow user
5. Click avatar/name to visit profile

## Examples

### Example Searches

**Collections:**
- "coffee shops tokyo" → Find coffee collections in Tokyo
- "beaches california" → Find beach collections in California
- "restaurants" + filter: Food & Drink → All restaurant collections
- Empty search + sort: Popular → Trending collections

**Users:**
- "john" → Find users named John
- "travel blogger" → Find users with "travel blogger" in bio
- "@traveler123" → Find user by username

## Future Enhancements

### Potential Improvements (not implemented yet)
- [ ] Command palette (Cmd+K) for quick search
- [ ] Recent searches (localStorage)
- [ ] Search suggestions/autocomplete
- [ ] "Near me" geolocation filtering
- [ ] Save searches
- [ ] Search within specific collection
- [ ] Advanced filters (date range, user, etc.)

## Competitive Advantage

**vs Pinbox:**
- ✅ Travlr has search, Pinbox doesn't
- ✅ Discover public collections (social discovery)
- ✅ Find users by name/username
- ✅ Filter by category and location

**vs Google My Maps:**
- ✅ Better UX with instant results
- ✅ Social features (follow users)
- ✅ User profiles and stats
- ✅ Mobile-optimized interface

## Architecture

```
User Input (300ms debounce)
    ↓
React State (searchQuery)
    ↓
useCallback hooks
    ↓
Supabase RPC call
    ↓
PostgreSQL full-text search (GIN index)
    ↓
Results + aggregated counts
    ↓
UI rendering (grid/list)
```

## Files

### Frontend
- `/src/app/search/page.tsx` - Main search page component
- `/src/components/Navbar.tsx` - Added SEARCH button
- `/src/components/MobileNav.tsx` - Added Search to mobile nav

### Backend
- `/migrations/add-search-functionality.sql` - Database migration
- `/migrations/README.md` - Migration instructions

### Documentation
- `/docs/SEARCH_FEATURE.md` - This file

## Testing Checklist

- [ ] Apply database migration
- [ ] Search for collections by name
- [ ] Search for collections by location
- [ ] Filter collections by category
- [ ] Sort collections (relevance, recent, popular)
- [ ] Search for users by username
- [ ] Search for users by display name
- [ ] Follow/unfollow from search results
- [ ] Click collection → Opens collection detail page
- [ ] Click user → Opens profile page
- [ ] Test on mobile device
- [ ] Test empty states (no results, no query)
- [ ] Test loading states
- [ ] Verify search is < 500ms response time

## Troubleshooting

### No results returned
1. Verify migration was applied: `SELECT search_vector FROM collections LIMIT 1;`
2. Check if collections are public: `SELECT is_public FROM collections;`
3. Test RPC directly in Supabase SQL Editor

### Slow search performance
1. Verify GIN indexes exist: `\d collections` in psql
2. Run `ANALYZE collections;` and `ANALYZE users;`
3. Check query plan: `EXPLAIN ANALYZE SELECT * FROM search_collections('test');`

### TypeScript errors
1. Run `npm run build` to check for type errors
2. Ensure Supabase types are up to date
3. Check that RPC functions match TypeScript interfaces

---

**Last Updated:** March 20, 2026
**Next Steps:** Apply migration and test search functionality
