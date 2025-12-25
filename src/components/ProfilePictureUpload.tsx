// Profile Picture Upload Component
// Save as: src/components/ProfilePictureUpload.tsx

'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null
  onImageUploaded: (url: string, path: string) => void
  onImageDeleted?: () => void
  userId: string
  userInitials: string
}

interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

// Simplified ImageUploadService for profile pictures
class ProfileImageUploadService {
  private static readonly BUCKET_NAME = 'travlr-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  static async uploadImage(file: File, userId: string): Promise<ImageUploadResult> {
    try {
      // Validate file
      if (!file) return { success: false, error: 'No file provided' }
      if (file.size > this.MAX_FILE_SIZE) return { success: false, error: 'File too large (max 5MB)' }
      if (!this.ALLOWED_TYPES.includes(file.type)) return { success: false, error: 'Invalid file type (only JPEG, PNG, WebP allowed)' }

      // Resize image before upload
      const resizedFile = await this.resizeImage(file, 400) // Profile pictures don't need to be huge

      // Generate unique filename
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `profiles/${timestamp}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading profile picture to:', filePath)

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))

        // Better error messages for common issues
        let errorMessage = error.message || 'Upload failed'

        if (!error.message && Object.keys(error).length === 0) {
          errorMessage = 'Storage bucket not found. Please set up Supabase Storage (see STORAGE_SETUP.md in project root)'
        } else if (error.message?.includes('not found')) {
          errorMessage = 'Storage bucket "travlr-images" not found. Please create it in Supabase dashboard (see STORAGE_SETUP.md)'
        } else if (error.message?.includes('policy')) {
          errorMessage = 'Permission denied. Please check storage RLS policies (see STORAGE_SETUP.md)'
        }

        return { success: false, error: errorMessage }
      }

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

  static async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([imagePath])

      return !error
    } catch (error) {
      console.error('Delete service error:', error)
      return false
    }
  }

  // Simple image resizing
  static async resizeImage(file: File, maxSize: number = 400): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (square crop for profile pictures)
        const size = Math.min(img.width, img.height)
        const scale = Math.min(maxSize / size, 1)
        canvas.width = size * scale
        canvas.height = size * scale

        // Draw resized image (center crop)
        const offsetX = (img.width - size) / 2
        const offsetY = (img.height - size) / 2
        ctx?.drawImage(img, offsetX, offsetY, size, size, 0, 0, canvas.width, canvas.height)

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

export default function ProfilePictureUpload({
  currentImageUrl,
  onImageUploaded,
  onImageDeleted,
  userId,
  userInitials
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload to Supabase
      const result = await ProfileImageUploadService.uploadImage(file, userId)

      if (result.success && result.url && result.path) {
        // Clean up preview URL
        URL.revokeObjectURL(preview)
        setPreviewUrl(result.url)
        setCurrentImagePath(result.path)
        onImageUploaded(result.url, result.path)
      } else {
        alert(result.error || 'Upload failed')
        setPreviewUrl(currentImageUrl || null)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async () => {
    if (!currentImagePath && !currentImageUrl) return

    try {
      // If we have a path, try to delete from storage
      if (currentImagePath) {
        const success = await ProfileImageUploadService.deleteImage(currentImagePath)
        if (!success) {
          alert('Failed to delete image from storage')
          return
        }
      }

      setPreviewUrl(null)
      setCurrentImagePath(null)
      setShowDeleteConfirm(false)
      onImageDeleted?.()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete image')
    }
  }

  const handleClick = () => {
    if (uploading) return
    fileInputRef.current?.click()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      
      {/* Profile Picture Display */}
      <div
        onClick={handleClick}
        style={{
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          background: previewUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          fontWeight: '700',
          cursor: uploading ? 'not-allowed' : 'pointer',
          border: '3px solid var(--card)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'var(--transition)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          if (!uploading) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Profile" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '50%'
            }}
          />
        ) : (
          userInitials
        )}
        
        {/* Upload overlay */}
        {!uploading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'var(--transition)',
            fontSize: '1rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0'
          }}
          >
            📷
          </div>
        )}
        
        {/* Loading overlay */}
        {uploading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.75rem'
          }}>
            ⏳
          </div>
        )}
      </div>

      {/* Delete button */}
      {previewUrl && !uploading && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowDeleteConfirm(true)
          }}
          style={{
            position: 'absolute',
            top: '-0.25rem',
            right: '-0.25rem',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            background: 'var(--destructive)',
            border: '2px solid var(--card)',
            color: 'white',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--destructive-hover)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--destructive)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Delete profile picture"
        >
          ✕
        </button>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
              Delete Profile Picture
            </h3>
            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--muted-foreground)' }}>
              Are you sure you want to delete your profile picture? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn"
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteImage}
                className="btn btn-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload instructions */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 'var(--space-sm)',
        fontSize: '0.75rem',
        color: 'var(--muted-foreground)',
        textAlign: 'center',
        width: '8rem'
      }}>
        {uploading ? 'Uploading...' : 'Click to change'}
      </div>
    </div>
  )
}