import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places API (New) Details Proxy
 *
 * This endpoint fetches detailed information about a place
 * using its place_id from the NEW Google Places API.
 *
 * Query Parameters:
 * - place_id: Google Places place_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')

    // Validate required parameters
    if (!placeId || placeId.trim().length === 0) {
      return NextResponse.json(
        { error: 'place_id parameter is required' },
        { status: 400 }
      )
    }

    // Validate API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Places API not configured' },
        { status: 500 }
      )
    }

    // NEW Places API endpoint
    const googleUrl = `https://places.googleapis.com/v1/places/${placeId.trim()}`

    // Field mask for NEW API - specify which fields to return
    const fieldMask = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'businessStatus',
      'rating',
      'userRatingCount',
      'nationalPhoneNumber',
      'internationalPhoneNumber',
      'websiteUri',
      'priceLevel',
      'regularOpeningHours',
      'googleMapsUri'
    ].join(',')

    console.log('📍 Google Places API (New) Details request:', { placeId })

    const response = await fetch(googleUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      }
    })

    const data = await response.json()

    // Check for API errors
    if (!response.ok) {
      console.error('Google Places API error:', response.status, data)
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch place details' },
        { status: response.status }
      )
    }

    // Transform NEW API response to match our expected legacy format
    const transformedResult = {
      place_id: data.id || placeId,
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      geometry: {
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0
        }
      },
      types: data.types || [],
      business_status: data.businessStatus || '',
      rating: data.rating || 0,
      user_ratings_total: data.userRatingCount || 0,
      formatted_phone_number: data.nationalPhoneNumber || '',
      international_phone_number: data.internationalPhoneNumber || '',
      website: data.websiteUri || '',
      price_level: data.priceLevel || null,
      opening_hours: data.regularOpeningHours ? {
        open_now: data.regularOpeningHours.openNow,
        weekday_text: data.regularOpeningHours.weekdayDescriptions || []
      } : null,
      url: data.googleMapsUri || ''
    }

    console.log('✅ Place details retrieved:', transformedResult.name)

    return NextResponse.json({
      result: transformedResult,
      status: 'OK'
    })

  } catch (error) {
    console.error('Place Details API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
