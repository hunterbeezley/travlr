// Itinerary planner types
// Part of #134

export interface Itinerary {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ItineraryItem {
  id: string
  itinerary_id: string
  title: string
  description: string | null
  place_id: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  category: string | null
  scheduled_date: string
  scheduled_time: string | null
  duration_minutes: number
  notes: string | null
  url: string | null
  phone: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
  opening_hours?: {
    open_now: boolean
  }
  photos?: Array<{
    photo_reference: string
  }>
}
