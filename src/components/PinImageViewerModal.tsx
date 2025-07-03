'use client'
import { useState, useEffect } from 'react'
import { DatabaseService } from '@/lib/database'
import ImageSlideshow from './ImageSlideshow'

interface PinImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  pinId: string
  pinTitle?: string
}

interface PinImageData {
  url: string
  order: number
}

export default function PinImageViewerModal({
  isOpen,
  onClose,
  pinId,
  pinTitle = 'Pin Images'
}: PinImageViewerModalProps) {
  const [images, setImages] = useState<PinImageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && pinId) {
      loadPinImages()
    }
  }, [isOpen, pinId])

  const loadPinImages = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('📷 Loading images for pin:', pinId)
      
      const pinImages = await DatabaseService.getPinImages(pinId)
      
      console.log('📥 Loaded pin images:', pinImages)

      if (pinImages.length === 0) {
        setImages([])
      } else {
        // Transform to the format expected by ImageSlideshow
        const imageData: PinImageData[] = pinImages.map(img => ({
          url: img.image_url,
          order: img.upload_order
        }))
        setImages(imageData)
      }
    } catch (error) {
      console.error('💥 Error loading pin images:', error)
      setError('Failed to load images')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🖼️ {pinTitle}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              fontSize: '1.25rem',
              transition: 'var(--transition)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--muted-foreground)'
            }}>
              ⏳ Loading images...
            </div>
          ) : error ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--destructive)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
              <div>{error}</div>
              <button
                onClick={loadPinImages}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          ) : images.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'var(--muted-foreground)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No Images</div>
              <div style={{ fontSize: '0.875rem' }}>This pin doesn't have any images</div>
            </div>
          ) : (
            <>
              {/* Image Slideshow */}
              <ImageSlideshow 
                images={images} 
                title={pinTitle}
              />
              
              {/* Image Info */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)',
                textAlign: 'center'
              }}>
                {images.length} image{images.length !== 1 ? 's' : ''} • 
                Use arrow keys or click thumbnails to navigate
              </div>
            </>
          )}

          {/* Close Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}