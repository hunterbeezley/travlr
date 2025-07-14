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
      backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darker backdrop for better contrast
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      {/* Enhanced Close Button - Positioned absolutely for better visibility */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1001,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#000',
          border: '2px solid rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(4px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)'
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        title="Close"
      >
        ✕
      </button>

      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border)'
      }}>
        {/* Header - Simplified since we have the floating close button */}
        <div style={{
          padding: '1.5rem',
          paddingRight: '4rem', // Extra space for the close button
          borderBottom: '1px solid var(--border)'
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
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              fontSize: '1rem',
              color: 'var(--muted-foreground)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid var(--muted)',
                  borderTop: '2px solid var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Loading images...
              </div>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              fontSize: '1rem',
              color: 'var(--destructive)',
              textAlign: 'center'
            }}>
              <div>
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
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              fontSize: '1rem',
              color: 'var(--muted-foreground)',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                <div>No images found for this pin</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  Add some images to see them here!
                </div>
              </div>
            </div>
          ) : (
            <>
              <ImageSlideshow images={images.map(img => img.url)} />
              <div style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)'
              }}>
                {images.length} image{images.length !== 1 ? 's' : ''} • 
                Use arrow keys or click thumbnails to navigate
              </div>
            </>
          )}

          {/* Bottom Close Button - Secondary option */}
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
                fontSize: '0.875rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-dark)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animation for loading spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}