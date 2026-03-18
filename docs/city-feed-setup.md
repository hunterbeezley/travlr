# City Feed Setup Guide

## Overview
The city-based discovery feed is now implemented but requires city data to be populated on pins to function.

## Migration Status
- ✅ Database schema updated (migration file created)
- ⚠️ Migration needs to be applied to Supabase
- ⚠️ City data needs to be populated on pins

## Step 1: Apply Migration

Run the migration on your Supabase database:

```bash
psql YOUR_SUPABASE_CONNECTION_STRING -f migrations/add-city-location-fields.sql
```

Or apply via Supabase Dashboard:
1. Go to SQL Editor
2. Open `migrations/add-city-location-fields.sql`
3. Execute the SQL

## Step 2: Populate City Data

### Option A: Update Pin Creation (Recommended for New Pins)

Modify `PinCreationModal.tsx` to extract and save city data when creating pins from Google Places:

```typescript
// In the handleSave function, after fetching place details:
const placeDetails = await fetch(`/api/google-places/details?place_id=${selectedPlace.place_id}`)
const data = await placeDetails.json()

// Extract city, state, country from address_components
const addressComponents = data.result?.address_components || []
let city = null
let state = null
let country = null
let country_code = null

for (const component of addressComponents) {
  if (component.types.includes('locality')) {
    city = component.long_name
  }
  if (component.types.includes('administrative_area_level_1')) {
    state = component.short_name
  }
  if (component.types.includes('country')) {
    country = component.long_name
    country_code = component.short_name
  }
}

// Include in pin insert:
const { data: newPin, error } = await supabase
  .from('pins')
  .insert({
    // ... existing fields
    city,
    state,
    country,
    country_code
  })
```

### Option B: Backfill Existing Pins

Create a script to populate city data for existing pins that have a `place_id`:

```typescript
// scripts/backfill-pin-cities.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key needed for admin access
)

async function backfillPinCities() {
  // Get all pins with place_id but no city
  const { data: pins, error } = await supabase
    .from('pins')
    .select('id, place_id')
    .not('place_id', 'is', null)
    .is('city', null)

  if (error) {
    console.error('Error fetching pins:', error)
    return
  }

  console.log(`Found ${pins.length} pins to backfill`)

  for (const pin of pins) {
    try {
      // Fetch place details from Google Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pin.place_id}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()

      if (data.status !== 'OK') {
        console.error(`Error fetching place ${pin.place_id}:`, data.status)
        continue
      }

      // Extract city, state, country from address_components
      const addressComponents = data.result?.address_components || []
      let city = null
      let state = null
      let country = null
      let country_code = null

      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          city = component.long_name
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name
        }
        if (component.types.includes('country')) {
          country = component.long_name
          country_code = component.short_name
        }
      }

      // Update pin with city data
      const { error: updateError } = await supabase
        .from('pins')
        .update({ city, state, country, country_code })
        .eq('id', pin.id)

      if (updateError) {
        console.error(`Error updating pin ${pin.id}:`, updateError)
      } else {
        console.log(`✓ Updated pin ${pin.id}: ${city}, ${state}, ${country}`)
      }

      // Rate limit: Google Places API has quota limits
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error(`Error processing pin ${pin.id}:`, err)
    }
  }

  console.log('Backfill complete!')
}

backfillPinCities()
```

Run the backfill script:
```bash
npx tsx scripts/backfill-pin-cities.ts
```

## Step 3: Test the Feed

1. Navigate to the app
2. Click the "FEED" tab in the sidebar
3. Select a city from the dropdown
4. Collections from that city should appear
5. Try different sort options and the Friends Only filter

## Expected Behavior

- **City Selector**: Shows all cities that have public collections with pin count
- **Collections Grid**: Displays collections from the selected city
- **Sort Options**:
  - **Popular**: Sorted by number of pins
  - **Recent**: Sorted by creation date (newest first)
  - **Top Rated**: Sorted by net vote score
- **Friends Only**: Filters to only show collections from users you follow
- **Empty States**: Helpful messages when no cities or collections exist

## Troubleshooting

### No cities showing up
- Check if pins have `city` field populated
- Run query: `SELECT COUNT(*) FROM pins WHERE city IS NOT NULL;`
- If zero, run backfill script or update pin creation logic

### Collections not appearing in feed
- Verify collections are public: `SELECT * FROM collections WHERE is_public = true;`
- Check RLS policies allow reading public collections
- Verify pins in collections have city data

### "No Collections Found" for a city
- Check that collections with pins in that city exist
- Verify the `get_collections_by_city()` function is working:
  ```sql
  SELECT * FROM get_collections_by_city('San Francisco', 'popular', 50, 0, false);
  ```

## Related Files

- **Migration**: `migrations/add-city-location-fields.sql`
- **Component**: `src/components/CityFeed.tsx`
- **Database Methods**: `src/lib/database.ts` (lines 1106-1186)
- **Interfaces**: `src/lib/database.ts` (lines 188-212)

## Issue Tracking

- **GitHub Issue**: #29
- **Status**: Core implementation complete, awaiting city data population
- **Blockers**: City data needs to be populated on existing pins
