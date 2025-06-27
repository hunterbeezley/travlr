// src/lib/database.ts
import { supabase } from './supabase'

export interface UserStats {
  collections_count: number
  public_collections_count: number
  pins_count: number
  followers_count: number
  following_count: number
  likes_received: number
}

export interface CollectionWithDetails {
  id: string
  title: string
  description: string | null
  created_at: string
  user_id: string
  username: string
  user_profile_image: string | null
  pin_count: number
  like_count: number
  first_pin_image: string | null
}

export interface CollectionWithStats {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  pin_count: number
  like_count: number
  first_pin_image: string | null
}

export interface Pin {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  image_url: string | null
  category: string | null
  created_at: string
}

export interface CollectionWithPins {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
  pin_count: number
  username: string
  user_profile_image: string | null
  like_count: number
  pins: Pin[]
}

export class DatabaseService {
  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_stats', {
        user_uuid: userId
      })

      if (error) {
        console.error('Error getting user stats:', error)
        return null
      }

      return data as UserStats
    } catch (error) {
      console.error('DatabaseService error:', error)
      return null
    }
  }

  /**
   * Get collection with all pins and details
   */
  static async getCollectionWithPins(collectionId: string): Promise<CollectionWithPins | null> {
    try {
      const { data, error } = await supabase.rpc('get_collection_with_pin_count', {
        collection_uuid: collectionId
      })

      if (error) {
        console.error('Error getting collection:', error)
        return null
      }

      return data as CollectionWithPins
    } catch (error) {
      console.error('DatabaseService error:', error)
      return null
    }
  }

  /**
   * Check if user is following another user
   */
  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_following', {
        follower_uuid: followerId,
        following_uuid: followingId
      })

      if (error) {
        console.error('Error checking follow status:', error)
        return false
      }

      return data as boolean
    } catch (error) {
      console.error('DatabaseService error:', error)
      return false
    }
  }

  /**
   * Get public collections for discovery feed
   */
  static async getPublicCollections(): Promise<CollectionWithDetails[]> {
    try {
      const { data, error } = await supabase.rpc('get_public_collections_with_details')

      if (error) {
        console.error('Error getting public collections:', error)
        return []
      }

      return data as CollectionWithDetails[]
    } catch (error) {
      console.error('DatabaseService error:', error)
      return []
    }
  }

  /**
   * Create a new collection
   */
  static async createCollection(
    userId: string, 
    title: string, 
    description?: string, 
    isPublic: boolean = false
  ) {
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          title,
          description,
          is_public: isPublic
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating collection:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to create collection' }
    }
  }

  /**
   * Create a new pin
   */
  static async createPin(
    userId: string,
    collectionId: string,
    title: string,
    latitude: number,
    longitude: number,
    description?: string,
    imageUrl?: string,
    category?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('pins')
        .insert({
          user_id: userId,
          collection_id: collectionId,
          title,
          latitude,
          longitude,
          description,
          image_url: imageUrl,
          category
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating pin:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to create pin' }
    }
  }
}