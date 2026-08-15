import { logger } from '@/lib/logger'
import { checkRateLimit, RateLimitConfig } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places API (New) Photo Proxy
 *
 * Resolves a Places API (New) photo resource name (e.g.
 * "places/{place_id}/photos/{photo_reference}", as returned by the details
 * route's `photos[].name`) to an actual image, without exposing the API key
 * to the client. Google's photo media endpoint responds with a 302 redirect
 * to a plain, key-less CDN URL - we follow that server-side and redirect
 * the browser there directly, rather than proxying image bytes ourselves.
 *
 * Query Parameters:
 * - name: Places API (New) photo resource name (required)
 * - maxWidthPx: max image width in pixels (optional, default 800)
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(request, RateLimitConfig.SEARCH)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const maxWidthPx = searchParams.get('maxWidthPx') || '800'

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name parameter is required' },
        { status: 400 }
      )
    }

    // Photo resource names always start with "places/" - reject anything
    // else rather than forwarding an arbitrary path to Google with our key.
    if (!name.startsWith('places/')) {
      return NextResponse.json(
        { error: 'Invalid photo resource name' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      logger.error('GOOGLE_PLACES_API_KEY not configured')
      return NextResponse.json(
        { error: 'Google Places API not configured' },
        { status: 500 }
      )
    }

    const googleUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${encodeURIComponent(maxWidthPx)}&key=${apiKey}`

    const response = await fetch(googleUrl, { redirect: 'manual' })

    // Google's media endpoint responds with a 302 to the actual image CDN
    // URL by default (skipHttpRedirect not set) - forward that redirect.
    const location = response.headers.get('location')
    if ((response.status === 302 || response.status === 303) && location) {
      return NextResponse.redirect(location)
    }

    logger.error('Unexpected Google Places photo response:', response.status)
    return NextResponse.json(
      { error: 'Failed to resolve photo' },
      { status: 502 }
    )
  } catch (error) {
    logger.error('Place Photo API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
