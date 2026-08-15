// Collection and Pin types with timeline/itinerary support
// Part of #134

export type ViewMode = 'list' | 'timeline'

export interface Profile {
  username: string | null
  full_name: string | null
  profile_image: string | null
}

export interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  color: string
  created_at: string
  user_id: string
  profiles: Profile
  // Timeline/itinerary fields
  view_mode: ViewMode
  start_date: string | null
  end_date: string | null
}

export interface PinImage {
  image_url: string
  upload_order: number
}

export interface Pin {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  category: string | null
  created_at: string
  pin_images: PinImage[]
  // Timeline/itinerary fields
  scheduled_date: string | null
  scheduled_time: string | null
  duration_minutes: number | null
  timeline_notes: string | null
  // Set when this pin was copied in via the Discover fork flow
  forked_from?: {
    collectionId: string
    collectionTitle: string
    username: string
  }
}

export interface Comment {
  id: string
  collection_id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
  username?: string
  profile_image?: string | null
  full_name?: string | null
}
