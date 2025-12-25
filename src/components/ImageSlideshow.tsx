'use client'
import { useState } from 'react'

interface ImageSlideshowProps {
  images: Array<{
    url: string
    order: number
  }>
  title?: string
  className?: string
}

export default function ImageSlideshow({
  images,
  title,
  className = ''
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Sort images by order
  const sortedImages = [...images].sort((a, b) => a.order - b.order)

  if (sortedImages.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        backgroundColor: 'var(--muted)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted-foreground)',
        fontSize: '0.875rem'
      }} className={className}>
        📷 No images available
      </div>
    )
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => prev === 0 ? sortedImages.length - 1 : prev - 1)
  }

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % sortedImages.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  const currentImage = sortedImages[currentIndex]

  return (
    <div style={{ width: '100%' }} className={className}>
      {/* Main Image Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '250px',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)'
      }}>
        {/* Main Image */}
        <img
          src={currentImage.url}
          alt={title ? `${title} - Image ${currentIndex + 1}` : `Image ${currentIndex + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjk3Mjc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgZXJyb3I8L3RleHQ+PC9zdmc+'
          }}
        />

        {/* Navigation Arrows (only show if multiple images) */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              style={{
                position: 'absolute',
                left: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'var(--transition)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
              }}
            >
              ←
            </button>

            <button
              onClick={goToNext}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'var(--transition)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
              }}
            >
              →
            </button>
          </>
        )}

        {/* Image Counter */}
        {sortedImages.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.75rem',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {currentIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip (only show if multiple images) */}
      {sortedImages.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          {sortedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              style={{
                flexShrink: 0,
                width: '60px',
                height: '45px',
                border: `2px solid ${index === currentIndex ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'var(--transition)',
                opacity: index === currentIndex ? 1 : 0.7,
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = index === currentIndex ? '1' : '0.7'
              }}
            >
              <img
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}