/**
 * Google Places API Helper Utilities
 *
 * This file contains helper functions for working with Google Places API data,
 * including type mapping and data formatting.
 */

/**
 * Map Google Places types to app categories
 *
 * Google returns an array of types for each place (e.g., ['restaurant', 'food', 'point_of_interest'])
 * This function maps those to our predefined app categories.
 */
export function mapGoogleTypeToCategory(types: string[]): string {
  if (!types || types.length === 0) return 'other'

  // Priority order for type mapping
  // Check most specific types first
  const typeMap: Record<string, string> = {
    // Food & Drink
    restaurant: 'restaurant',
    cafe: 'cafe',
    bar: 'bar',
    bakery: 'cafe',
    meal_takeaway: 'restaurant',
    meal_delivery: 'restaurant',
    food: 'restaurant',

    // Attractions & Culture
    tourist_attraction: 'attraction',
    museum: 'attraction',
    art_gallery: 'attraction',
    amusement_park: 'attraction',
    aquarium: 'attraction',
    zoo: 'attraction',
    stadium: 'attraction',
    movie_theater: 'activity',
    bowling_alley: 'activity',
    casino: 'activity',

    // Nature & Outdoors
    park: 'nature',
    campground: 'nature',
    natural_feature: 'nature',
    hiking_area: 'nature',
    beach: 'nature',

    // Shopping
    shopping_mall: 'shopping',
    store: 'shopping',
    clothing_store: 'shopping',
    jewelry_store: 'shopping',
    shoe_store: 'shopping',
    book_store: 'shopping',
    supermarket: 'shopping',
    convenience_store: 'shopping',

    // Lodging
    lodging: 'hotel',
    hotel: 'hotel',
    motel: 'hotel',
    resort: 'hotel',

    // Transportation
    airport: 'transport',
    train_station: 'transport',
    bus_station: 'transport',
    transit_station: 'transport',
    subway_station: 'transport',
    taxi_stand: 'transport',
    parking: 'transport',

    // Activities
    gym: 'activity',
    spa: 'activity',
    night_club: 'activity',
    library: 'activity'
  }

  // Find first matching type in priority order
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type]
    }
  }

  // Default fallback
  return 'other'
}

/**
 * Format business status for display
 */
export function getBusinessStatusDisplay(status: string | null): {
  text: string
  color: string
} {
  if (!status) {
    return { text: 'Unknown', color: '#6b7280' } // gray
  }

  switch (status) {
    case 'OPERATIONAL':
      return { text: 'Open', color: '#22c55e' } // green
    case 'CLOSED_TEMPORARILY':
      return { text: 'Temporarily Closed', color: '#f59e0b' } // orange
    case 'CLOSED_PERMANENTLY':
      return { text: 'Permanently Closed', color: '#ef4444' } // red
    default:
      return { text: status, color: '#6b7280' } // gray
  }
}

/**
 * Convert Google Places API price level to integer
 * Google Places API (new) returns price_level as a string enum
 */
export function convertPriceLevel(priceLevel: any): number | null {
  // Handle null/undefined
  if (priceLevel === null || priceLevel === undefined) return null

  // If already a number, return it
  if (typeof priceLevel === 'number') return priceLevel

  // If string, convert from enum to number
  if (typeof priceLevel === 'string') {
    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 0,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4
    }
    return priceLevelMap[priceLevel] ?? null
  }

  return null
}

/**
 * Format price level for display
 */
export function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel === null || priceLevel === undefined) return ''

  switch (priceLevel) {
    case 0:
      return 'Free'
    case 1:
      return '$'
    case 2:
      return '$$'
    case 3:
      return '$$$'
    case 4:
      return '$$$$'
    default:
      return ''
  }
}

/**
 * Format rating for display with stars
 */
export function formatRating(rating: number | null): string {
  if (!rating) return ''

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  let stars = '★'.repeat(fullStars)
  if (hasHalfStar) stars += '☆'
  stars += '☆'.repeat(emptyStars)

  return `${stars} ${rating.toFixed(1)}`
}

/**
 * Extract place data from Google Places Details API response
 */
export interface PlaceData {
  place_id: string
  place_name: string
  place_types: string[]
  business_status: string | null
  rating: number | null
  rating_count: number | null
  phone_number: string | null
  website: string | null
  price_level: number | null
  opening_hours: any | null
}

export function extractPlaceData(googleResult: any): PlaceData {
  return {
    place_id: googleResult.place_id,
    place_name: googleResult.name || googleResult.formatted_address,
    place_types: googleResult.types || [],
    business_status: googleResult.business_status || null,
    rating: googleResult.rating || null,
    rating_count: googleResult.user_ratings_total || null,
    phone_number: googleResult.formatted_phone_number || googleResult.international_phone_number || null,
    website: googleResult.website || null,
    price_level: convertPriceLevel(googleResult.price_level),
    opening_hours: googleResult.opening_hours || null
  }
}

/**
 * Check if place data is stale and needs refresh
 */
export function isPlaceDataStale(lastRefresh: string | null, daysThreshold: number = 30): boolean {
  if (!lastRefresh) return true

  const lastRefreshDate = new Date(lastRefresh)
  const now = new Date()
  const daysSinceRefresh = (now.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceRefresh > daysThreshold
}

/**
 * Format phone number for tel: link
 */
export function formatPhoneForLink(phone: string | null): string {
  if (!phone) return ''
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '')
}
