import { logger } from '@/lib/logger'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'
import { sanitizeString, validateCoordinates, validateNumber } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places API (New) Autocomplete Proxy
 *
 * This endpoint proxies requests to the NEW Google Places API
 * to keep the API key secure on the server side.
 *
 * Query Parameters:
 * - input: Search query string
 * - location: Optional lat,lng for proximity bias
 * - radius: Optional radius in meters for proximity bias
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - 30 requests per minute for search
    const rateLimitResponse = await checkRateLimit(request, RateLimitConfig.SEARCH)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')
    const location = searchParams.get('location')
    const radius = searchParams.get('radius') || '50000' // Default 50km

    // Validate and sanitize input
    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input parameter is required' },
        { status: 400 }
      )
    }

    if (input.length > 200) {
      return NextResponse.json(
        { error: 'Input parameter is too long (max 200 characters)' },
        { status: 400 }
      )
    }

    const sanitizedInput = sanitizeString(input)

    // Validate API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      logger.error('GOOGLE_PLACES_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Places API not configured' },
        { status: 500 }
      )
    }

    // Build request body for NEW Places API
    const requestBody: any = {
      input: sanitizedInput,
      languageCode: 'en',
      includedRegionCodes: ['us'] // Restrict to US
    }

    // Add location bias if provided
    if (location) {
      const [lat, lng] = location.split(',').map(Number)

      // Validate coordinates
      const coordValidation = validateCoordinates(lat, lng)
      if (!coordValidation.valid) {
        return NextResponse.json(
          { error: coordValidation.error },
          { status: 400 }
        )
      }

      // Validate radius
      const radiusNum = parseFloat(radius)
      const radiusValidation = validateNumber(radiusNum, 1, 100000) // Max 100km
      if (!radiusValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid radius (must be between 1 and 100000 meters)' },
          { status: 400 }
        )
      }

      requestBody.locationBias = {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radiusNum
        }
      }
    }

    // NEW Places API endpoint
    const googleUrl = 'https://places.googleapis.com/v1/places:autocomplete'

    logger.log('🔍 Google Places API (New) Autocomplete request:', { input, location, radius })

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    // Check for API errors
    if (!response.ok) {
      logger.error('Google Places API error:', response.status, data)
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch autocomplete results' },
        { status: response.status }
      )
    }

    // Transform NEW API response to match our expected format
    const predictions = (data.suggestions || []).map((suggestion: any) => ({
      place_id: suggestion.placePrediction?.placeId || '',
      description: suggestion.placePrediction?.text?.text || '',
      types: suggestion.placePrediction?.types || []
    }))

    logger.log('✅ Autocomplete results:', predictions.length)

    return NextResponse.json({
      predictions,
      status: 'OK'
    })

  } catch (error) {
    logger.error('Autocomplete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
