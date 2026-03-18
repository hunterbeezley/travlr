'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Toast from '@/components/Toast'

interface Profile {
  username: string | null
  full_name: string | null
  profile_image: string | null
}

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  color: string
  created_at: string
  user_id: string
  profiles: Profile
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
  created_at: string
  pin_images: PinImage[]
}

interface CollectionPageClientProps {
  collection: Collection
  pins: Pin[]
  pinCount: number
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

export default function CollectionPageClient({
  collection,
  pins,
  pinCount,
  isOwner
}: CollectionPageClientProps) {
  const router = useRouter()
  const [showShareToast, setShowShareToast] = useState(false)

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: collection.title,
          text: collection.description || `Check out ${collection.title} on Travlr`,
          url: url
        })
      } catch {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 3000)
    }
  }

  const displayName = collection.profiles.full_name ||
                      collection.profiles.username ||
                      'Anonymous'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      paddingTop: '80px'
    }}>
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <svg width="32" height="32" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
              <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
              <circle cx="24" cy="24" r="6" fill="var(--color-red)"/>
              <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
            </svg>
            Travlr
          </div>

          <button
            onClick={() => router.back()}
            className="btn btn-secondary btn-small"
            aria-label="Go back to previous page"
          >
            ← BACK
          </button>
        </div>
      </nav>

      {/* Hero Image/Map Preview */}
      {pins.length > 0 && (
        <div className="collection-hero" style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--muted)'
        }}>
          {(() => {
            // Get first pin with image
            const firstPinWithImage = pins.find(pin => pin.pin_images && pin.pin_images.length > 0)

            if (firstPinWithImage) {
              const firstImage = firstPinWithImage.pin_images.sort((a, b) => a.upload_order - b.upload_order)[0]

              return (
                <>
                  <Image
                    src={firstImage.image_url}
                    alt={collection.title}
                    fill
                    style={{
                      objectFit: 'cover',
                      filter: 'brightness(0.7)'
                    }}
                    priority
                    sizes="100vw"
                  />
                  {/* Overlay with collection info */}
                  <div className="collection-hero-overlay" style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '3rem'
                  }}>
                    <div style={{
                      maxWidth: '1200px',
                      width: '100%',
                      margin: '0 auto'
                    }}>
                      <div className="collection-hero-badge" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: `${collection.color}40`,
                        border: `1px solid ${collection.color}`,
                        borderRadius: 'var(--radius)',
                        marginBottom: '1rem',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: collection.color
                        }} />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'white',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
                        }}>
                          {pinCount} {pinCount === 1 ? 'PIN' : 'PINS'}
                        </span>
                      </div>
                      <h1 className="collection-hero-title" style={{
                        fontSize: '3rem',
                        fontWeight: '700',
                        color: 'white',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                      }}>
                        {collection.title}
                      </h1>
                    </div>
                  </div>
                </>
              )
            } else {
              // Show map with all pins
              const centerLat = pins.reduce((sum, pin) => sum + pin.latitude, 0) / pins.length
              const centerLng = pins.reduce((sum, pin) => sum + pin.longitude, 0) / pins.length

              // Create markers string for static map
              const markers = pins.slice(0, 10).map(pin =>
                `${pin.latitude},${pin.longitude}`
              ).join('|')

              const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=12&size=1200x800&markers=color:red%7C${markers}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&scale=2&style=feature:poi|visibility:off&style=feature:transit|visibility:off`

              return (
                <>
                  <img
                    src={mapUrl}
                    alt={`Map of ${collection.title}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.7)'
                    }}
                  />
                  {/* Overlay with collection info */}
                  <div className="collection-hero-overlay" style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '3rem'
                  }}>
                    <div style={{
                      maxWidth: '1200px',
                      width: '100%',
                      margin: '0 auto'
                    }}>
                      <div className="collection-hero-badge" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: `${collection.color}40`,
                        border: `1px solid ${collection.color}`,
                        borderRadius: 'var(--radius)',
                        marginBottom: '1rem',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: collection.color
                        }} />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'white',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
                        }}>
                          {pinCount} {pinCount === 1 ? 'PIN' : 'PINS'}
                        </span>
                      </div>
                      <h1 className="collection-hero-title" style={{
                        fontSize: '3rem',
                        fontWeight: '700',
                        color: 'white',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                      }}>
                        {collection.title}
                      </h1>
                    </div>
                  </div>
                </>
              )
            }
          })()}
        </div>
      )}

      {/* Content Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '3rem',
          marginBottom: '2rem'
        }}>
          {/* Collection Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Only show title if no pins (no hero section) */}
              {pins.length === 0 && (
                <>
                  {/* Color indicator */}
                  <div style={{
                    width: '60px',
                    height: '6px',
                    background: collection.color,
                    borderRadius: '3px',
                    marginBottom: '1.5rem'
                  }} />

                  <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'var(--foreground)',
                    marginBottom: '1rem',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {collection.title}
                  </h1>
                </>
              )}

              {collection.description && (
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {collection.description}
                </p>
              )}

              {/* Creator info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                {collection.profiles.profile_image ? (
                  <Image
                    src={collection.profiles.profile_image}
                    alt={displayName}
                    width={32}
                    height={32}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem'
                  }}>
                    {displayName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--foreground)',
                    fontWeight: '600'
                  }}>
                    {displayName}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    {new Date(collection.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    <strong style={{ color: 'var(--foreground)' }}>{pinCount}</strong> {pinCount === 1 ? 'pin' : 'pins'}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{collection.is_public ? '🌍' : '🔒'}</span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    {collection.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: 'column'
            }}>
              <button
                onClick={handleShare}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>🔗</span> SHARE
              </button>

              {isOwner && (
                <button
                  onClick={() => router.push('/')}
                  className="btn btn-secondary"
                >
                  EDIT COLLECTION
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pins Grid */}
        {pins.length > 0 ? (
          <>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--foreground)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Pins in this Collection
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {pins.map((pin) => {
                const firstImage = pin.pin_images.sort((a, b) => a.upload_order - b.upload_order)[0]
                const emoji = categoryEmojis[pin.category || 'other'] || '📍'

                return (
                  <div
                    key={pin.id}
                    onClick={() => router.push(`/pins/${pin.id}`)}
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
                    {/* Pin Image */}
                    {firstImage ? (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '75%',
                        background: 'var(--muted)',
                        overflow: 'hidden'
                      }}>
                        <Image
                          src={firstImage.image_url}
                          alt={pin.title}
                          fill
                          style={{
                            objectFit: 'cover'
                          }}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        paddingTop: '75%',
                        background: 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4rem',
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

                    {/* Pin Info */}
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: 'var(--foreground)',
                          margin: 0,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {pin.title}
                        </h3>
                      </div>

                      {pin.description && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'var(--muted-foreground)',
                          lineHeight: '1.5',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {pin.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          // Empty state
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📍</div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--foreground)',
              marginBottom: '0.5rem'
            }}>
              No pins yet
            </h3>
            <p style={{
              color: 'var(--muted-foreground)',
              marginBottom: '1.5rem'
            }}>
              {isOwner
                ? 'Start adding pins to this collection from the map'
                : 'This collection is empty'}
            </p>
            {isOwner && (
              <button
                onClick={() => router.push('/')}
                className="btn btn-primary"
              >
                GO TO MAP
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <Toast
          message="Link copied to clipboard!"
          icon="🔗"
          onClose={() => setShowShareToast(false)}
        />
      )}
    </div>
  )
}
