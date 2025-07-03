'use client'
import { useState, useRef } from 'react'
import { ImageUploadService } from '@/lib/imageUpload'

interface SingleImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (url: string, path: string) => void
  onImageRemoved?: () => void
  userId: string
  disabled?: boolean
}

export default function SingleImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  userId,
  disabled = false
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File too large (max 5MB)')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Invalid file type (only JPEG, PNG, WebP allowed)')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Create preview immediately
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload to Supabase storage
      const result = await ImageUploadService.uploadImage(file, userId, 'pins')

      if (result.success && result.url && result.path) {
        // Clean up preview URL since we now have the real URL
        URL.revokeObjectURL(preview)
        setPreviewUrl(result.url)
        onImageUploaded(result.url, result.path)
      } else {
        setError(result.error || 'Upload failed')
        setPreviewUrl(currentImageUrl || null)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Upload failed')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    setError(null)
    onImageRemoved?.()
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Upload Area */}
      {!previewUrl ? (
        <div
          onClick={handleClick}
          style={{
            width: '100%',
            height: '200px',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--muted)',
            transition: 'var(--transition)',
            opacity: disabled ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.backgroundColor = 'var(--muted)'
          }}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                Uploading image...
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                Click to upload an image
                <br />
                <small>JPEG, PNG, WebP (max 5MB)</small>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Image Preview */
        <div style={{ 
          position: 'relative',
          width: '100%',
          height: '200px',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--border)'
        }}>
          <img
            src={previewUrl}
            alt="Pin image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              console.error('Image load error')
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjk3Mjc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+'
            }}
          />

          {/* Upload overlay when uploading */}
          {uploading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              ⏳ Uploading...
            </div>
          )}

          {/* Action buttons */}
          {!uploading && (
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              display: 'flex',
              gap: '0.5rem'
            }}>
              {/* Replace button */}
              <button
                onClick={handleClick}
                disabled={disabled}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '0.5rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent)'
                }}
              >
                📷 Replace
              </button>

              {/* Remove button */}
              <button
                onClick={handleRemoveImage}
                disabled={disabled}
                style={{
                  backgroundColor: 'var(--destructive)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  padding: '0.5rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--destructive-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--destructive)'
                }}
              >
                🗑️ Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}