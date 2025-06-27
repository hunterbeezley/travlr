
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
   * Get user's collections with stats
   */
  static async getUserCollections(userId: string): Promise<CollectionWithStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_collections_with_stats', {
        user_uuid: userId
      })

      if (error) {
        console.error('Error getting user collections:', error)
        return []
      }

      return data as CollectionWithStats[]
    } catch (error) {
      console.error('DatabaseService error:', error)
      return []
    }
  }

  /**
   * Search public collections
   */
  static async searchCollections(searchTerm: string): Promise<CollectionWithDetails[]> {
    try {
      const { data, error } = await supabase.rpc('search_public_collections', {
        search_term: searchTerm
      })

      if (error) {
        console.error('Error searching collections:', error)
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

  /**
   * Toggle follow/unfollow
   */
  static async toggleFollow(followerId: string, followingId: string) {
    try {
      // Check if already following
      const isCurrentlyFollowing = await this.isFollowing(followerId, followingId)

      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId)

        if (error) {
          console.error('Error unfollowing:', error)
          return { success: false, error: error.message }
        }

        return { success: true, action: 'unfollowed' }
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: followerId,
            following_id: followingId
          })

        if (error) {
          console.error('Error following:', error)
          return { success: false, error: error.message }
        }

        return { success: true, action: 'followed' }
      }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to toggle follow' }
    }
  }

  /**
   * Toggle like/unlike collection
   */
  static async toggleLike(userId: string, collectionId: string) {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionId)
        .single()

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('collection_id', collectionId)

        if (error) {
          console.error('Error unliking:', error)
          return { success: false, error: error.message }
        }

        return { success: true, action: 'unliked' }
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            collection_id: collectionId
          })

        if (error) {
          console.error('Error liking:', error)
          return { success: false, error: error.message }
        }

        return { success: true, action: 'liked' }
      }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to toggle like' }
    }
  }
}