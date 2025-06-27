import { supabase } from './supabase'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

export class ImageUploadService {
  private static readonly BUCKET_NAME = 'travlr-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  /**
   * Upload an image file to Supabase storage
   */
  static async uploadImage(
    file: File, 
    userId: string, 
    folder: 'profiles' | 'pins' = 'profiles'
  ): Promise<ImageUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${timestamp}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading to path:', filePath)

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return { success: false, error: error.message }
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('Upload service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  /**
   * Delete an image from storage
   */
  static async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([imagePath])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete service error:', error)
      return false
    }
  }

  /**
   * Get public URL for an image
   */
  static getImageUrl(imagePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(imagePath)
    
    return data.publicUrl
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' }
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large (max 5MB)' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type (only JPEG, PNG, WebP allowed)' }
    }

    return { valid: true }
  }

  /**
   * Resize image client-side before upload (optional)
   */
  static async resizeImage(file: File, maxWidth: number = 800): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw resized image
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: file.type })
            resolve(resizedFile)
          } else {
            resolve(file) // Fallback to original
          }
        }, file.type, 0.8)
      }

      img.src = URL.createObjectURL(file)
    })
  }
}