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
  user_id: string
  collection_id: string
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

export interface UserProfile {
  id: string
  email: string
  username: string | null
  bio: string | null
  profile_image: string | null
  created_at: string
}

export interface PinImage {
  id: string
  pin_id: string
  image_url: string
  image_path: string
  upload_order: number
  created_at: string
  user_id: string
}

export class DatabaseService {
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
    console.log('🔧 DatabaseService.createPin called with:', {
      userId,
      collectionId,
      title,
      latitude,
      longitude,
      description,
      imageUrl,
      category
    })

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
        console.error('❌ Database error creating pin:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Pin created successfully:', data)
      return { success: true, data }
    } catch (error) {
      console.error('💥 DatabaseService error:', error)
      return { success: false, error: 'Failed to create pin' }
    }
  }

 /**
 * Update an existing pin
 */
static async updatePin(
  pinId: string,
  userId: string,
  updates: {
    title?: string
    description?: string
    category?: string
    image_url?: string
  }
) {
  console.log('🔧 DatabaseService.updatePin called with:', {
    pinId,
    userId,
    updates
  })

  try {
    // First verify the user owns this pin
    const { data: existingPin, error: fetchError } = await supabase
      .from('pins')
      .select('user_id')
      .eq('id', pinId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching pin for ownership check:', fetchError)
      return { success: false, error: 'Pin not found' }
    }

    if (existingPin.user_id !== userId) {
      console.error('❌ User does not own this pin')
      return { success: false, error: 'You can only edit your own pins' }
    }

    // Update the pin
    const { data, error } = await supabase
      .from('pins')
      .update(updates)
      .eq('id', pinId)
      .eq('user_id', userId) // Double check ownership in the query
      .select()
      .single()

    if (error) {
      console.error('❌ Database error updating pin:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Pin updated successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('💥 DatabaseService error:', error)
    return { success: false, error: 'Failed to update pin' }
  }
}

/**
 * Delete a pin (bonus method for complete CRUD)
 */
static async deletePin(pinId: string, userId: string) {
  console.log('🔧 DatabaseService.deletePin called with:', { pinId, userId })

  try {
    // Verify ownership and delete in one query
    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', pinId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Database error deleting pin:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Pin deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('💥 DatabaseService error:', error)
    return { success: false, error: 'Failed to delete pin' }
  }
}

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
    console.log('🔧 DatabaseService.createCollection called with:', {
      userId,
      title,
      description,
      isPublic
    })

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
        console.error('❌ Database error creating collection:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Collection created successfully:', data)
      return { success: true, data }
    } catch (error) {
      console.error('💥 DatabaseService error:', error)
      return { success: false, error: 'Failed to create collection' }
    }
  }

  /**
   * Get user's collections
   */
  static async getUserCollections(userId: string) {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, title, description, is_public, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error getting user collections:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to get collections' }
    }
  }

  /**
   * Get user's pins
   */
  static async getUserPins(userId: string): Promise<Pin[]> {
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error getting user pins:', error)
        return []
      }

      return data as Pin[]
    } catch (error) {
      console.error('DatabaseService error:', error)
      return []
    }
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting user profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('DatabaseService error:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string, 
    updates: Partial<Pick<UserProfile, 'username' | 'bio' | 'profile_image'>>
  ) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('DatabaseService error:', error)
      return { success: false, error: 'Failed to update profile' }
    }
  }
  /**
 * Save multiple images for a pin to the pin_images table
 */
static async savePinImages(
  pinId: string,
  userId: string,
  images: { image_url: string; image_path: string; upload_order: number }[]
) {
  console.log('🔧 DatabaseService.savePinImages called with:', { pinId, userId, imageCount: images.length })

  if (images.length === 0) {
    console.log('✅ No images to save')
    return { success: true, data: [] }
  }

  try {
    // Prepare image data
    const imageData = images.map(img => ({
      pin_id: pinId,
      user_id: userId,
      image_url: img.image_url,
      image_path: img.image_path,
      upload_order: img.upload_order
    }))

    const { data, error } = await supabase
      .from('pin_images')
      .insert(imageData)
      .select()

    if (error) {
      console.error('❌ Database error saving pin images:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Pin images saved successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('💥 DatabaseService error:', error)
    return { success: false, error: 'Failed to save pin images' }
  }
}

/**
 * Get all images for a specific pin
 */
static async getPinImages(pinId: string): Promise<PinImage[]> {
  console.log('🔧 DatabaseService.getPinImages called for pin:', pinId)

  try {
    const { data, error } = await supabase
      .from('pin_images')
      .select('*')
      .eq('pin_id', pinId)
      .order('upload_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching pin images:', error)
      return []
    }

    console.log('✅ Found pin images:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('💥 DatabaseService error:', error)
    return []
  }
}

/**
 * Get the first image URL for a pin (for backward compatibility with map display)
 */
static async getFirstPinImageUrl(pinId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pin_images')
      .select('image_url')
      .eq('pin_id', pinId)
      .order('upload_order', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.image_url
  } catch (error) {
    console.error('Error getting first pin image:', error)
    return null
  }
}

/**
 * Delete all images for a pin (used when deleting a pin)
 */
static async deletePinImages(pinId: string, userId: string) {
  console.log('🔧 DatabaseService.deletePinImages called for pin:', pinId)

  try {
    // First get the image paths so we can delete from storage
    const { data: images } = await supabase
      .from('pin_images')
      .select('image_path')
      .eq('pin_id', pinId)
      .eq('user_id', userId)

    // Delete from database
    const { error } = await supabase
      .from('pin_images')
      .delete()
      .eq('pin_id', pinId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error deleting pin images from database:', error)
      return { success: false, error: error.message }
    }

    // Delete from storage (background task - don't wait for it)
    if (images && images.length > 0) {
      images.forEach(async (img) => {
        try {
          await supabase.storage
            .from('travlr-images')
            .remove([img.image_path])
        } catch (storageError) {
          console.warn('Failed to delete image from storage:', storageError)
        }
      })
    }

    console.log('✅ Pin images deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('💥 DatabaseService error:', error)
    return { success: false, error: 'Failed to delete pin images' }
  }
}

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('username')
        .eq('username', username)

      if (excludeUserId) {
        query = query.neq('id', excludeUserId)
      }

      const { data, error } = await query.single()

      if (error && error.code === 'PGRST116') {
        // No rows found = username is available
        return true
      }

      // Username found = not available
      return false
    } catch (error) {
      console.error('Error checking username availability:', error)
      return false
    }
  }

}

