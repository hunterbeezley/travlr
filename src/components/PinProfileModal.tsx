'use client'
import { useState, useEffect } from 'react'
import { DatabaseService, CompletePinData, Pin } from '@/lib/database'
import ImageSlideshow from './ImageSlideshow'
import { useAuth } from '@/hooks/useAuth'

interface PinProfileModalProps {
  isOpen: boolean
  onClose: () => void
  pinId: string
  onEditPin?: (pin: Pin) => void
}

interface PinImageData {
  url: string
  order: number
}

// Category emoji mapping
const categoryEmojis: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  attraction: '🎯',
  nature: '🌲',
  shopping: '🛍️',
  hotel: '🏨',
  transport: '🚌',
  activity: '🎪',
  other: '📍'
}

const categoryLabels: Record<string, string> = {
  restaurant: 'RESTAURANT',
  cafe: 'CAFÉ',
  bar: 'BAR/PUB',
  attraction: 'ATTRACTION',
  nature: 'NATURE',
  shopping: 'SHOPPING',
  hotel: 'HOTEL',
  transport: 'TRANSPORT',
  activity: 'ACTIVITY',
  other: 'OTHER'
}

export default function PinProfileModal({
  isOpen,
  onClose,
  pinId,
  onEditPin
}: PinProfileModalProps) {
  const { user } = useAuth()

  // Data states
  const [pinData, setPinData] = useState<CompletePinData | null>(null)
  const [address, setAddress] = useState<string>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Loading states
  const [loading, setLoading] = useState(true)
  const [addressLoading, setAddressLoading] = useState(false)

  // UI states
  const [error, setError] = useState<string | null>(null)
  const [showShareToast, setShowShareToast] = useState(false)

  // Load pin data when modal opens
  useEffect(() => {
    if (!isOpen || !pinId) return

    const loadPinProfile = async () => {
      setLoading(true)
      setError(null)
      setCurrentImageIndex(0)

      try {
        console.log('📍 Loading pin profile for:', pinId)

        // Fetch complete pin data
        const data = await DatabaseService.getCompletePinData(pinId)

        if (!data) {
          setError('Pin not found')
          return
        }

        setPinData(data)
        console.log('✅ Pin data loaded:', data)

        // Fetch address (parallel, non-blocking)
        fetchAddress(data.latitude, data.longitude)
      } catch (err) {
        console.error('💥 Error loading pin profile:', err)
        setError('Failed to load pin details')
      } finally {
        setLoading(false)
      }
    }

    loadPinProfile()
  }, [isOpen, pinId])

  // Fetch reverse geocoded address from Mapbox
  const fetchAddress = async (latitude: number, longitude: number) => {
    setAddressLoading(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=address,poi,place`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        setAddress(data.features[0].place_name)
      } else {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    } finally {
      setAddressLoading(false)
    }
  }

  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index)
  }

  // Handle get directions
  const handleGetDirections = () => {
    if (!pinData) return

    const { latitude, longitude } = pinData
    const userAgent = navigator.userAgent.toLowerCase()

    let mapsUrl = ''
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('mac')) {
      mapsUrl = `https://maps.apple.com/?q=${latitude},${longitude}`
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    }

    window.open(mapsUrl, '_blank')
  }

  // Handle share pin
  const handleShare = async () => {
    if (!pinData) return

    const shareText = `Check out "${pinData.title}" at ${address || `${pinData.latitude}, ${pinData.longitude}`}`

    try {
      // Try native share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: pinData.title,
          text: shareText,
          url: `${window.location.origin}/#pin-${pinData.id}`
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText)
        setShowShareToast(true)
        setTimeout(() => setShowShareToast(false), 3000)
      }
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  // Handle edit pin
  const handleEdit = () => {
    if (!pinData || !onEditPin) return

    const pin: Pin = {
      id: pinData.id,
      title: pinData.title,
      description: pinData.description,
      category: pinData.category,
      latitude: pinData.latitude,
      longitude: pinData.longitude,
      created_at: pinData.created_at,
      user_id: pinData.creator_id,
      collection_id: pinData.collection_id,
      image_url: pinData.images[0]?.image_url || null
    }

    onEditPin(pin)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Transform images for ImageSlideshow
  const images: PinImageData[] = pinData?.images.map(img => ({
    url: img.image_url,
    order: img.upload_order
  })) || []

  const isOwner = user && pinData && user.id === pinData.creator_id

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      {/* Close Button */}
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
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
        title="Close"
      >
        ✕
      </button>

      {/* Modal Container */}
      <div style={{
        backgroundColor: 'rgba(39, 39, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            fontSize: '1rem',
            color: 'var(--muted-foreground)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid var(--muted)',
                borderTop: '3px solid var(--accent)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading pin profile...
            </div>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            fontSize: '1rem',
            color: 'var(--destructive)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        ) : pinData ? (
          <>
            {/* Header Section */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <h2 style={{
                margin: 0,
                marginBottom: '0.75rem',
                fontSize: '1.5rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em'
              }}>
                {pinData.title}
              </h2>
              {pinData.category && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '700',
                  letterSpacing: '0.1em'
                }}>
                  {categoryEmojis[pinData.category] || '📍'} {categoryLabels[pinData.category] || pinData.category.toUpperCase()}
                </div>
              )}
            </div>

            {/* Hero Image Section */}
            {images.length > 0 && (
              <div style={{
                borderBottom: '1px solid var(--border)'
              }}>
                <ImageSlideshow images={images} />
              </div>
            )}

            {/* Pin Details Section */}
            <div style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Creator Card */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {pinData.creator_profile_image ? (
                  <img
                    src={pinData.creator_profile_image}
                    alt={pinData.creator_username || 'User'}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    border: '2px solid var(--border)'
                  }}>
                    👤
                  </div>
                )}
                <div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.1em',
                    marginBottom: '0.25rem'
                  }}>
                    CREATED BY
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    @{pinData.creator_username || 'anonymous'}
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  marginBottom: '0.5rem'
                }}>
                  📍 LOCATION
                </div>
                {addressLoading ? (
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    Loading address...
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    marginBottom: '0.5rem'
                  }}>
                    {address}
                  </div>
                )}
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  🗺️ {pinData.latitude.toFixed(4)}, {pinData.longitude.toFixed(4)}
                </div>
              </div>

              {/* Collection Card */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.1em',
                    marginBottom: '0.5rem'
                  }}>
                    📂 COLLECTION
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {pinData.collection_title}
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: pinData.collection_is_public ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                  color: pinData.collection_is_public ? '#22c55e' : '#9ca3af',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '700',
                  letterSpacing: '0.1em'
                }}>
                  {pinData.collection_is_public ? 'PUBLIC' : 'PRIVATE'}
                </div>
              </div>

              {/* Description Card */}
              {pinData.description && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.1em',
                    marginBottom: '0.5rem'
                  }}>
                    📝 DESCRIPTION
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {pinData.description}
                  </div>
                </div>
              )}

              {/* Metadata Card */}
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em'
                }}>
                  CREATED: {formatDate(pinData.created_at)}
                </div>
              </div>
            </div>

            {/* Gallery Thumbnails Section */}
            {images.length > 1 && (
              <div style={{
                padding: '0 1.5rem 1.5rem',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.1em',
                  marginBottom: '0.75rem'
                }}>
                  🖼️ ALL IMAGES ({images.length})
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem'
                }}>
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleThumbnailClick(idx)}
                      style={{
                        width: '80px',
                        height: '80px',
                        border: idx === currentImageIndex
                          ? '3px solid var(--accent)'
                          : '2px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                        backgroundColor: 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (idx !== currentImageIndex) {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.opacity = '0.8'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (idx !== currentImageIndex) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.opacity = '1'
                        }
                      }}
                    >
                      <img
                        src={img.url}
                        alt={`Image ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div style={{
              padding: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleGetDirections}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: 'var(--foreground)',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--foreground)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                🧭 GET DIRECTIONS
              </button>

              <button
                onClick={handleShare}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: 'var(--foreground)',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--foreground)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                🔗 SHARE PIN
              </button>

              {isOwner && (
                <button
                  onClick={handleEdit}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: '2px solid var(--accent)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 57, 70, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  ✏️ EDIT PIN
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Share Toast Notification */}
      {showShareToast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '1rem 2rem',
          backgroundColor: 'var(--accent)',
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: '700',
          letterSpacing: '0.1em',
          zIndex: 1002,
          animation: 'slideUp 0.3s ease'
        }}>
          ✓ LINK COPIED TO CLIPBOARD!
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
