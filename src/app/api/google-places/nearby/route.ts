import { logger } from '@/lib/logger'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'
import { validateCoordinates, validateNumber } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places API (New) Nearby Search Proxy
 *
 * This endpoint searches for places near a location
 * using the NEW Google Places API.
 *
 * Query Parameters:
 * - lat: Latitude (required)
 * - lng: Longitude (required)
 * - radius: Search radius in meters (default: 1500, max: 50000)
 * - types: Comma-separated place types (optional, e.g., "restaurant,cafe")
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 30 requests per minute for search
    const rateLimitResponse = await checkRateLimit(request, RateLimitConfig.SEARCH)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = searchParams.get('radius') || '1500'
    const types = searchParams.get('types')

    // Validate required parameters
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng parameters are required' },
        { status: 400 }
      )
    }

    // Parse and validate coordinates
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    const coordValidation = validateCoordinates(latNum, lngNum)
    if (!coordValidation.valid) {
      return NextResponse.json(
        { error: coordValidation.error },
        { status: 400 }
      )
    }

    // Validate radius
    const radiusNum = parseFloat(radius)
    const radiusValidation = validateNumber(radiusNum, 1, 50000)
    if (!radiusValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid radius (must be between 1 and 50000 meters)' },
        { status: 400 }
      )
    }

    // Validate API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      logger.error('GOOGLE_PLACES_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Places API not configured' },
        { status: 500 }
      )
    }

    // NEW Places API endpoint for nearby search
    const googleUrl = 'https://places.googleapis.com/v1/places:searchNearby'

    // Build request body
    const requestBody: {
      locationRestriction: {
        circle: {
          center: { latitude: number; longitude: number }
          radius: number
        }
      }
      includedTypes?: string[]
      maxResultCount?: number
      rankPreference?: string
    } = {
      locationRestriction: {
        circle: {
          center: {
            latitude: latNum,
            longitude: lngNum
          },
          radius: radiusNum
        }
      },
      maxResultCount: 20, // Reasonable limit for viewport
      rankPreference: 'POPULARITY' // Show popular places first
    }

    // Add types filter if provided
    if (types) {
      requestBody.includedTypes = types.split(',').map(t => t.trim())
    }

    // Field mask for NEW API - specify which fields to return
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.types',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.priceLevel',
      'places.businessStatus'
    ].join(',')

    logger.log('📍 Google Places Nearby Search:', { lat, lng, radius, types })

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    // Check for API errors
    if (!response.ok) {
      logger.error('Google Places API error:', response.status, data)
      return NextResponse.json(
        { error: data.error?.message || 'Failed to search nearby places' },
        { status: response.status }
      )
    }

    // Transform NEW API response
    const places = (data.places || []).map((place: {
      id: string
      displayName?: { text: string }
      types?: string[]
      location?: { latitude: number; longitude: number }
      rating?: number
      userRatingCount?: number
      priceLevel?: string
      businessStatus?: string
    }) => ({
      place_id: place.id,
      name: place.displayName?.text || 'Unknown',
      types: place.types || [],
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        }
      },
      rating: place.rating || 0,
      user_ratings_total: place.userRatingCount || 0,
      price_level: place.priceLevel || null,
      business_status: place.businessStatus || ''
    }))

    logger.log(`✅ Found ${places.length} nearby places`)

    return NextResponse.json({
      results: places,
      status: 'OK'
    })

  } catch (error) {
    logger.error('Nearby Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
