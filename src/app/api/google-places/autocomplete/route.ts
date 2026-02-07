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
    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')
    const location = searchParams.get('location')
    const radius = searchParams.get('radius') || '50000' // Default 50km

    // Validate required parameters
    if (!input || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input parameter is required' },
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

    // Build request body for NEW Places API
    const requestBody: any = {
      input: input.trim(),
      languageCode: 'en',
      includedRegionCodes: ['us'] // Restrict to US
    }

    // Add location bias if provided
    if (location) {
      const [lat, lng] = location.split(',').map(Number)
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: parseFloat(radius)
        }
      }
    }

    // NEW Places API endpoint
    const googleUrl = 'https://places.googleapis.com/v1/places:autocomplete'

    console.log('🔍 Google Places API (New) Autocomplete request:', { input, location, radius })

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
      console.error('Google Places API error:', response.status, data)
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

    console.log('✅ Autocomplete results:', predictions.length)

    return NextResponse.json({
      predictions,
      status: 'OK'
    })

  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
