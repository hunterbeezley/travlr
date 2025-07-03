'use client'
import { useState, useRef } from 'react'
import { ImageUploadService } from '@/lib/imageUpload'

interface ImageItem {
  id: string // temporary ID for tracking
  url: string
  path: string
  order: number
  isUploading: boolean
  isTemp: boolean // true if this is a preview while uploading
}

interface MultipleImageUploadProps {
  currentImages?: ImageItem[]
  onImagesChanged: (images: ImageItem[]) => void
  userId: string
  maxImages?: number
  disabled?: boolean
}

export default function MultipleImageUpload({
  currentImages = [],
  onImagesChanged,
  userId,
  maxImages = 5,
  disabled = false
}: MultipleImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>(currentImages)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateTempId = () => `temp_${Date.now()}_${Math.random()}`

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Check if we'll exceed the limit
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images`)
      return
    }

    console.log(`📷 Starting upload of ${files.length} files`)

    // Create temporary preview items immediately
    const tempImages: ImageItem[] = files.map((file, index) => ({
      id: generateTempId(),
      url: URL.createObjectURL(file),
      path: '',
      order: images.length + index,
      isUploading: true,
      isTemp: true
    }))

    // Add temp images to state for immediate preview
    const updatedImages = [...images, ...tempImages]
    setImages(updatedImages)
    onImagesChanged(updatedImages)

    // Upload files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const tempImageIndex = images.length + i

      try {
        console.log(`📤 Uploading file ${i + 1}/${files.length}:`, file.name)

        const result = await ImageUploadService.uploadImage(file, userId, 'pins')

        if (result.success && result.url && result.path) {
          console.log(`✅ Upload ${i + 1} successful:`, result.url)

          // Replace temp image with real uploaded image
          setImages(prev => {
            const newImages = [...prev]
            const tempImage = newImages[tempImageIndex]
            
            // Clean up temp URL
            if (tempImage.isTemp) {
              URL.revokeObjectURL(tempImage.url)
            }

            // Replace with real image data
            newImages[tempImageIndex] = {
              id: generateTempId(), // Keep temp ID for now
              url: result.url!,
              path: result.path!,
              order: tempImageIndex,
              isUploading: false,
              isTemp: false
            }

            onImagesChanged(newImages)
            return newImages
          })
        } else {
          console.error(`❌ Upload ${i + 1} failed:`, result.error)
          // Remove failed upload
          setImages(prev => {
            const newImages = prev.filter((_, index) => index !== tempImageIndex)
            onImagesChanged(newImages)
            return newImages
          })
          alert(`Failed to upload ${file.name}: ${result.error}`)
        }
      } catch (error) {
        console.error(`💥 Upload ${i + 1} error:`, error)
        // Remove failed upload
        setImages(prev => {
          const newImages = prev.filter((_, index) => index !== tempImageIndex)
          onImagesChanged(newImages)
          return newImages
        })
        alert(`Failed to upload ${file.name}`)
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    const imageToRemove = images[index]
    
    // Clean up temp URL if it's a preview
    if (imageToRemove.isTemp) {
      URL.revokeObjectURL(imageToRemove.url)
    }

    // Remove image and reorder
    const newImages = images
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, order: i }))
    
    setImages(newImages)
    onImagesChanged(newImages)
  }

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)
    
    // Update order numbers
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      order: index
    }))
    
    setImages(reorderedImages)
    onImagesChanged(reorderedImages)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderImages(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Upload Button */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
          disabled={disabled || images.length >= maxImages}
        />
        
        <div
          onClick={() => !disabled && images.length < maxImages && fileInputRef.current?.click()}
          style={{
            width: '100%',
            height: '120px',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || images.length >= maxImages ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--muted)',
            transition: 'var(--transition)',
            opacity: disabled || images.length >= maxImages ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!disabled && images.length < maxImages) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.backgroundColor = 'var(--muted)'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📷</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
            {images.length >= maxImages 
              ? `Maximum ${maxImages} images reached`
              : `Click to upload images (${images.length}/${maxImages})`
            }
            <br />
            <small>Select multiple files • JPEG, PNG, WebP</small>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!image.isUploading && !disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                border: '2px solid var(--border)',
                cursor: !image.isUploading && !disabled ? 'grab' : 'default',
                opacity: image.isUploading ? 0.7 : 1,
                transform: draggedIndex === index ? 'scale(1.05)' : 'scale(1)',
                transition: 'var(--transition)'
              }}
            >
              {/* Image */}
              <img
                src={image.url}
                alt={`Image ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjk3Mjc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+'
                }}
              />

              {/* Upload Progress Overlay */}
              {image.isUploading && (
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
                  color: 'white',
                  fontSize: '0.75rem'
                }}>
                  ⏳ Uploading...
                </div>
              )}

              {/* Order Badge */}
              <div style={{
                position: 'absolute',
                top: '0.25rem',
                left: '0.25rem',
                backgroundColor: 'var(--accent)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {index + 1}
              </div>

              {/* Remove Button */}
              {!image.isUploading && !disabled && (
                <button
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    backgroundColor: 'var(--destructive)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--destructive-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--destructive)'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {images.length > 1 && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--muted-foreground)',
          textAlign: 'center',
          marginTop: '0.5rem'
        }}>
          Drag images to reorder • First image will be shown on the map
        </div>
      )}
    </div>
  )
}