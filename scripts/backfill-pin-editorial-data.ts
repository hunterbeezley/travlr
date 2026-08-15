/**
 * Backfill Script: Populate editorial_summary and Google photos for existing pins
 * Part of "Surface real Google Places data on pins"
 *
 * Fetches place details (including editorial summary and photos) from Google
 * Places API for pins that have a place_id but no editorial_summary yet,
 * then updates the pin and auto-imports up to 5 Google photos into
 * pin_images, same as new pins get at creation time.
 *
 * Usage:
 *   npx tsx scripts/backfill-pin-editorial-data.ts [--limit=N]
 *
 * Run with a small --limit first to sanity-check output before the full sweep.
 *
 * Requirements:
 *   - Add SUPABASE_SERVICE_ROLE_KEY to .env.local file
 *   - Get service role key from: Supabase Dashboard > Settings > API > service_role key
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GOOGLE_API_KEY) {
  console.error('❌ Missing required environment variables:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  if (!GOOGLE_API_KEY) console.error('  - GOOGLE_PLACES_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

interface Pin {
  id: string
  place_id: string
  title: string
  user_id: string
}

interface PlacesPhoto {
  name: string
}

function buildPlacePhotoUrl(photoName: string, maxWidthPx = 800): string {
  return `/api/google-places/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`
}

async function backfillPinEditorialData() {
  console.log('🚀 Starting pin editorial summary/photos backfill...\n')

  let query = supabase
    .from('pins')
    .select('id, place_id, title, user_id')
    .not('place_id', 'is', null)
    .is('editorial_summary', null)

  if (limit) {
    query = query.limit(limit)
    console.log(`⚠️  Running with --limit=${limit}\n`)
  }

  const { data: pins, error: fetchError } = await query

  if (fetchError) {
    console.error('❌ Error fetching pins:', fetchError)
    process.exit(1)
  }

  if (!pins || pins.length === 0) {
    console.log('✅ All pins already have editorial data! Nothing to backfill.')
    process.exit(0)
  }

  console.log(`📊 Found ${pins.length} pins to backfill\n`)

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i] as Pin
    const progress = `[${i + 1}/${pins.length}]`

    try {
      console.log(`${progress} Processing: "${pin.title}" (${pin.id})`)

      const url = `https://places.googleapis.com/v1/places/${pin.place_id}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': GOOGLE_API_KEY!,
          'X-Goog-FieldMask': 'editorialSummary,photos'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`  ⚠️  Google API error: ${response.status} - ${errorText}`)
        errorCount++
        continue
      }

      const data = await response.json()
      const editorialSummary: string | null = data.editorialSummary?.text || null
      const photos: PlacesPhoto[] = data.photos || []

      if (!editorialSummary && photos.length === 0) {
        console.log('  ⚠️  No editorial summary or photos available, skipping')
        skippedCount++
        continue
      }

      const { error: updateError } = await supabase
        .from('pins')
        .update({ editorial_summary: editorialSummary })
        .eq('id', pin.id)

      if (updateError) {
        console.error('  ❌ Error updating pin:', updateError.message)
        errorCount++
        continue
      }

      if (photos.length > 0) {
        const photosToImport = photos.slice(0, 5)
        const { error: photosError } = await supabase
          .from('pin_images')
          .insert(
            photosToImport.map((photo, index) => ({
              pin_id: pin.id,
              user_id: pin.user_id,
              image_url: buildPlacePhotoUrl(photo.name),
              image_path: `google-photo:${photo.name}`,
              upload_order: index
            }))
          )

        if (photosError) {
          console.error('  ⚠️  Error importing photos:', photosError.message)
        }
      }

      console.log(`  ✅ Updated${editorialSummary ? ' (with summary)' : ''}${photos.length > 0 ? ` (${Math.min(photos.length, 5)} photos)` : ''}`)
      successCount++

      // Rate limit: conservative 10 requests/second
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (err) {
      console.error(`  ❌ Unexpected error processing pin ${pin.id}:`, err)
      errorCount++
    }
  }

  console.log('\n📊 Backfill Summary:')
  console.log(`  ✅ Successfully updated: ${successCount}`)
  console.log(`  ⚠️  Skipped (no data available): ${skippedCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log(`  📍 Total processed: ${pins.length}`)
}

backfillPinEditorialData().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
