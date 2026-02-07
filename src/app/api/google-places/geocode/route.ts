import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Geocoding API Proxy
 *
 * This endpoint performs reverse geocoding to get address information
 * from latitude/longitude coordinates.
 *
 * Query Parameters:
 * - latlng: Comma-separated latitude,longitude (required)
 * - result_type: Optional result type filter (e.g., 'street_address|route')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latlng = searchParams.get('latlng')
    const resultType = searchParams.get('result_type')

    // Validate required parameters
    if (!latlng || latlng.trim().length === 0) {
      return NextResponse.json(
        { error: 'latlng parameter is required (format: lat,lng)' },
        { status: 400 }
      )
    }

    // Validate latlng format
    const coords = latlng.split(',')
    if (coords.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid latlng format. Expected: lat,lng' },
        { status: 400 }
      )
    }

    const lat = parseFloat(coords[0])
    const lng = parseFloat(coords[1])

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude values' },
        { status: 400 }
      )
    }

    // Validate API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Geocoding API not configured' },
        { status: 500 }
      )
    }

    // Build Google Geocoding request
    const params = new URLSearchParams({
      latlng: latlng.trim(),
      key: apiKey
    })

    // Add result type filter if provided
    if (resultType) {
      params.append('result_type', resultType)
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`

    console.log('🗺️ Google Geocoding request:', { latlng, resultType })

    const response = await fetch(googleUrl)
    const data = await response.json()

    // Check for API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Geocoding API error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Failed to geocode location' },
        { status: response.status }
      )
    }

    console.log('✅ Geocoding results:', data.results?.length || 0)

    return NextResponse.json({
      results: data.results || [],
      status: data.status
    })

  } catch (error) {
    console.error('Geocoding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
