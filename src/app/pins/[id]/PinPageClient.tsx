'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Toast from '@/components/Toast'
import Navbar from '@/components/Navbar'
import PinEditModal from '@/components/PinEditModal'

interface Profile {
  username: string | null
  full_name: string | null
  profile_image: string | null
}

interface Collection {
  id: string
  title: string
  color: string
}

interface PinImage {
  image_url: string
  upload_order: number
}

interface Pin {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  category: string | null
  place_id: string | null
  place_name: string | null
  place_rating: number | null
  place_user_ratings_total: number | null
  place_business_status: string | null
  place_website: string | null
  place_phone: string | null
  place_price_level: number | null
  place_opening_hours: any
  created_at: string
  collection_id: string | null
  user_id: string
  profiles: Profile
  collections: Collection | null
  pin_images: PinImage[]
}

interface RelatedPin {
  id: string
  title: string
  category: string | null
  pin_images: PinImage[]
}

interface PinPageClientProps {
  pin: Pin
  relatedPins: RelatedPin[]
  isOwner: boolean
}

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

export default function PinPageClient({
  pin,
  relatedPins,
  isOwner
}: PinPageClientProps) {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentPin, setCurrentPin] = useState<Pin>(pin)

  const sortedImages = [...currentPin.pin_images].sort((a, b) => a.upload_order - b.upload_order)
  const emoji = categoryEmojis[currentPin.category || 'other'] || '📍'
  const displayName = currentPin.profiles.full_name || currentPin.profiles.username || 'Anonymous'

  const handleCopyCoordinates = async () => {
    const coords = `${currentPin.latitude}, ${currentPin.longitude}`
    await navigator.clipboard.writeText(coords)
    setShowCopyToast(true)
    setTimeout(() => setShowCopyToast(false), 3000)
  }

  const handlePinUpdated = (updatedPin: any) => {
    logger.log('Pin updated, refreshing page data')
    // Reload the page to get fresh data
    router.refresh()
  }

  const handlePinDeleted = (pinId: string) => {
    logger.log('Pin deleted, navigating to feed')
    // Navigate to feed after deletion
    router.push('/')
  }

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPin.title,
          text: currentPin.description || `Check out ${currentPin.title} on Travlr`,
          url: url
        })
      } catch {
        logger.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 3000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      paddingTop: '80px'
    }}>
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
        background: 'var(--background)',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh'
      }}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="btn btn-secondary btn-small"
          style={{ marginBottom: '1rem' }}
        >
          ← BACK
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem'
        }}>
          {/* Main Content */}
          <div>
            {/* Image Slideshow */}
            {sortedImages.length > 0 ? (
              <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: '66.67%',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                marginBottom: '2rem'
              }}>
                <Image
                  src={sortedImages[currentImageIndex].image_url}
                  alt={currentPin.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />

                {/* Image Navigation */}
                {sortedImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length)}
                      aria-label="Previous image"
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev + 1) % sortedImages.length)}
                      aria-label="Next image"
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      ›
                    </button>

                    {/* Image Indicators */}
                    <div
                      role="tablist"
                      aria-label="Image gallery navigation"
                      style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '0.5rem',
                        zIndex: 10
                      }}
                    >
                      {sortedImages.map((_, idx) => (
                        <button
                          key={idx}
                          role="tab"
                          aria-label={`Go to image ${idx + 1} of ${sortedImages.length}`}
                          aria-selected={idx === currentImageIndex}
                          onClick={() => setCurrentImageIndex(idx)}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: 'none',
                            background: idx === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (idx !== currentImageIndex) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (idx !== currentImageIndex) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'
                            }
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{
                width: '100%',
                paddingTop: '66.67%',
                background: 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '6rem',
                marginBottom: '2rem',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}>
                  {emoji}
                </div>
              </div>
            )}

            {/* Pin Info Card */}
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              {/* Collection Badge */}
              {currentPin.collections && (
                <div
                  onClick={() => router.push(`/collections/${currentPin.collections!.id}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: `${currentPin.collections!.color}20`,
                    border: `1px solid ${currentPin.collections!.color}`,
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${currentPin.collections!.color}30`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${currentPin.collections!.color}20`
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: currentPin.collections!.color
                  }} />
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase'
                  }}>
                    {currentPin.collections!.title}
                  </span>
                </div>
              )}

              {/* Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '2rem' }}>{emoji}</span>
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: 'var(--foreground)',
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {currentPin.title}
                </h1>
              </div>

              {/* Description */}
              {currentPin.description && (
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {currentPin.description}
                </p>
              )}

              {/* Creator Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)'
              }}>
                {currentPin.profiles.profile_image ? (
                  <Image
                    src={currentPin.profiles.profile_image}
                    alt={displayName}
                    width={40}
                    height={40}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    Added by
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: 'var(--foreground)',
                    fontWeight: '600'
                  }}>
                    {displayName}
                  </div>
                </div>
              </div>
            </div>

            {/* Place Details (if available) */}
            {currentPin.place_id && (
              <div style={{
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--foreground)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Place Details
                </h2>

                <div style={{
                  display: 'grid',
                  gap: '1rem'
                }}>
                  {currentPin.place_rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>⭐</span>
                      <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>
                        {currentPin.place_rating.toFixed(1)}
                      </span>
                      {currentPin.place_user_ratings_total && (
                        <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                          ({currentPin.place_user_ratings_total.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {currentPin.place_price_level && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>💰</span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {'$'.repeat(currentPin.place_price_level)}
                      </span>
                    </div>
                  )}

                  {currentPin.place_business_status && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {currentPin.place_business_status === 'OPERATIONAL' ? '✅' : '⚠️'}
                      </span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {currentPin.place_business_status === 'OPERATIONAL' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  )}

                  {currentPin.place_website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🌐</span>
                      <a
                        href={currentPin.place_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--accent)',
                          textDecoration: 'underline',
                          fontSize: '0.875rem'
                        }}
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  {currentPin.place_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>📞</span>
                      <a
                        href={`tel:${currentPin.place_phone.replace(/[^0-9+]/g, '')}`}
                        style={{
                          color: 'var(--accent)',
                          textDecoration: 'underline',
                          fontSize: '0.875rem'
                        }}
                      >
                        {currentPin.place_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Card */}
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--foreground)',
                marginBottom: '1rem',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Location
              </h2>

              {/* Embedded Map - Desktop */}
              <div style={{
                width: '100%',
                height: '300px',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${currentPin.latitude},${currentPin.longitude}&zoom=15`}
                />
              </div>

              {/* Coordinates */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    marginBottom: '0.25rem'
                  }}>
                    Coordinates
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {currentPin.latitude.toFixed(6)}, {currentPin.longitude.toFixed(6)}
                  </div>
                </div>

                <button
                  onClick={handleCopyCoordinates}
                  className="btn btn-secondary btn-small"
                  aria-label="Copy coordinates to clipboard"
                >
                  📋 COPY
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleShare}
                className="btn btn-primary"
                aria-label="Share this pin"
                style={{
                  flex: 1,
                  minWidth: '150px'
                }}
              >
                🔗 SHARE PIN
              </button>

              {isOwner && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    minWidth: '150px'
                  }}
                >
                  ✏️ EDIT PIN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Related Pins */}
        {relatedPins.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--foreground)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              More from {currentPin.collections?.title}
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {relatedPins.map((relatedPin) => {
                const firstImage = relatedPin.pin_images.sort((a, b) => a.upload_order - b.upload_order)[0]
                const relatedEmoji = categoryEmojis[relatedPin.category || 'other'] || '📍'

                return (
                  <div
                    key={relatedPin.id}
                    onClick={() => router.push(`/pins/${relatedPin.id}`)}
                    style={{
                      background: 'var(--card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {firstImage ? (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '100%',
                        background: 'var(--muted)'
                      }}>
                        <Image
                          src={firstImage.image_url}
                          alt={relatedPin.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="200px"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        paddingTop: '100%',
                        background: 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                          {relatedEmoji}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1rem' }}>{relatedEmoji}</span>
                        <h3 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--foreground)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {relatedPin.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Pin Modal */}
      <PinEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        pin={currentPin ? {
          id: currentPin.id,
          title: currentPin.title,
          description: currentPin.description,
          category: currentPin.category,
          image_url: sortedImages[0]?.image_url || null,
          latitude: currentPin.latitude,
          longitude: currentPin.longitude,
          user_id: currentPin.user_id,
          collection_id: currentPin.collection_id || ''
        } : null}
        onPinUpdated={handlePinUpdated}
        onPinDeleted={handlePinDeleted}
      />

      {/* Toast Notification */}
      {showCopyToast && (
        <Toast
          message="Copied to clipboard!"
          variant="success"
          onClose={() => setShowCopyToast(false)}
        />
      )}
    </div>
  )
}
