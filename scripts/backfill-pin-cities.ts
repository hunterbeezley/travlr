/**
 * Backfill Script: Populate city, state, country data for existing pins
 * Part of Issue #29 - City-based discovery feed
 *
 * This script fetches place details from Google Places API for pins that have
 * a place_id but are missing city data, then updates the pins with location info.
 *
 * Usage:
 *   npx tsx scripts/backfill-pin-cities.ts
 *
 * Requirements:
 *   - Add SUPABASE_SERVICE_ROLE_KEY to .env.local file
 *   - Get service role key from: Supabase Dashboard > Settings > API > service_role key
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GOOGLE_API_KEY) {
  console.error('❌ Missing required environment variables:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  if (!GOOGLE_API_KEY) console.error('  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface AddressComponent {
  longText: string
  shortText: string
  types: string[]
}

interface PlacesApiResponse {
  addressComponents?: AddressComponent[]
}

interface Pin {
  id: string
  place_id: string
  title: string
}

async function backfillPinCities() {
  console.log('🚀 Starting pin cities backfill...\n')

  // Step 1: Fetch all pins with place_id but no city
  console.log('📍 Fetching pins that need city data...')
  const { data: pins, error: fetchError } = await supabase
    .from('pins')
    .select('id, place_id, title')
    .not('place_id', 'is', null)
    .is('city', null)

  if (fetchError) {
    console.error('❌ Error fetching pins:', fetchError)
    process.exit(1)
  }

  if (!pins || pins.length === 0) {
    console.log('✅ All pins already have city data! Nothing to backfill.')
    process.exit(0)
  }

  console.log(`📊 Found ${pins.length} pins to backfill\n`)

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  // Step 2: Process each pin
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i]
    const progress = `[${i + 1}/${pins.length}]`

    try {
      console.log(`${progress} Processing: "${pin.title}" (${pin.id})`)

      // Fetch place details from Google Places API (New)
      // See: https://developers.google.com/maps/documentation/places/web-service/place-details
      const url = `https://places.googleapis.com/v1/places/${pin.place_id}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'addressComponents'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`  ⚠️  Google API error: ${response.status} - ${errorText}`)
        errorCount++
        continue
      }

      const data = await response.json()

      if (!data.addressComponents) {
        console.log(`  ⚠️  No address components found, skipping`)
        skippedCount++
        continue
      }

      // Step 3: Extract city, state, country from addressComponents
      const addressComponents = data.addressComponents
      let city: string | null = null
      let state: string | null = null
      let country: string | null = null
      let country_code: string | null = null

      for (const component of addressComponents) {
        // City can be in different types depending on the location
        if (component.types.includes('locality')) {
          city = component.longText
        } else if (!city && component.types.includes('sublocality')) {
          city = component.longText
        } else if (!city && component.types.includes('administrative_area_level_2')) {
          // Fallback for some locations where city is in level 2
          city = component.longText
        }

        if (component.types.includes('administrative_area_level_1')) {
          state = component.shortText
        }

        if (component.types.includes('country')) {
          country = component.longText
          country_code = component.shortText
        }
      }

      // If we didn't find a city, log and skip
      if (!city) {
        console.log(`  ⚠️  No city found in address components, skipping`)
        skippedCount++
        continue
      }

      // Step 4: Update pin with city data
      const { error: updateError } = await supabase
        .from('pins')
        .update({
          city,
          state,
          country,
          country_code
        })
        .eq('id', pin.id)

      if (updateError) {
        console.error(`  ❌ Error updating pin:`, updateError.message)
        errorCount++
        continue
      }

      console.log(`  ✅ Updated: ${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`)
      successCount++

      // Rate limit: Google Places API allows ~100 requests per second
      // We'll be conservative and do 10 per second (100ms delay)
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (err) {
      console.error(`  ❌ Unexpected error processing pin ${pin.id}:`, err)
      errorCount++
    }
  }

  // Step 5: Print summary
  console.log('\n📊 Backfill Summary:')
  console.log(`  ✅ Successfully updated: ${successCount}`)
  console.log(`  ⚠️  Skipped (no city): ${skippedCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log(`  📍 Total processed: ${pins.length}`)

  if (successCount > 0) {
    console.log('\n🎉 Backfill complete! Your pins now have city data.')
    console.log('   You can now use the City Feed feature.')
  } else {
    console.log('\n⚠️  No pins were updated. Check the errors above.')
  }
}

// Run the backfill
backfillPinCities().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
