'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { DatabaseService, CompletePinData, Pin } from '@/lib/database'
import ImageSlideshow from './ImageSlideshow'
import { useAuth } from '@/hooks/useAuth'
import FollowButton from './FollowButton'
import { getBusinessStatusDisplay, formatPriceLevel, formatRating, formatPhoneForLink, isPlaceDataStale } from '@/lib/placeHelpers'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categoryIcons'
import { X, User, AlertTriangle, Check, Phone, Globe, Navigation, Share2, Pencil } from 'lucide-react'

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
        logger.log('📍 Loading pin profile for:', pinId)

        // Fetch complete pin data
        const data = await DatabaseService.getCompletePinData(pinId)

        if (!data) {
          setError('Pin not found')
          return
        }

        setPinData(data)
        logger.log('✅ Pin data loaded:', data)

        // Fetch address (parallel, non-blocking)
        fetchAddress(data.latitude, data.longitude)

        // Auto-refresh place data if stale (>30 days old)
        if ((data as any).place_id && isPlaceDataStale((data as any).last_place_refresh, 30)) {
          logger.log('📅 Place data is stale, refreshing in background...')
          refreshPlaceDataInBackground(pinId)
        }
      } catch (err) {
        logger.error('💥 Error loading pin profile:', err)
        setError('Failed to load pin details')
      } finally {
        setLoading(false)
      }
    }

    loadPinProfile()
  }, [isOpen, pinId])

  // Refresh place data in background
  const refreshPlaceDataInBackground = async (pinId: string) => {
    try {
      const result = await DatabaseService.refreshPlaceData(pinId)
      if (result.success) {
        logger.log('✅ Place data refreshed successfully')
        // Optionally reload pin data to show updated info
        const refreshedData = await DatabaseService.getCompletePinData(pinId)
        if (refreshedData) {
          setPinData(refreshedData)
        }
      } else {
        logger.warn('⚠️ Failed to refresh place data:', result.error)
      }
    } catch (error) {
      logger.error('💥 Error refreshing place data:', error)
    }
  }

  // Fetch reverse geocoded address from Google Geocoding API
  const fetchAddress = async (latitude: number, longitude: number) => {
    setAddressLoading(true)
    try {
      const response = await fetch(
        `/api/google-places/geocode?latlng=${latitude},${longitude}`
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address)
      } else {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch (error) {
      logger.error('Error fetching address:', error)
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
      logger.error('Share failed:', err)
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
      image_url: pinData.images[0]?.image_url || null,
      // Include Google Places data
      place_id: (pinData as any).place_id || null,
      place_name: (pinData as any).place_name || null,
      place_types: (pinData as any).place_types || null,
      business_status: (pinData as any).business_status || null,
      rating: (pinData as any).rating || null,
      rating_count: (pinData as any).rating_count || null,
      phone_number: (pinData as any).phone_number || null,
      website: (pinData as any).website || null,
      price_level: (pinData as any).price_level !== undefined ? (pinData as any).price_level : null,
      opening_hours: (pinData as any).opening_hours || null,
      last_place_refresh: (pinData as any).last_place_refresh || null,
      // Location fields
      city: (pinData as any).city || null,
      state: (pinData as any).state || null,
      country: (pinData as any).country || null,
      country_code: (pinData as any).country_code || null
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
  const CategoryIcon = pinData?.category ? getCategoryIcon(pinData.category) : null

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
          top: 'max(1rem, env(safe-area-inset-top))',
          right: 'max(1rem, env(safe-area-inset-right))',
          zIndex: 1001,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#000',
          border: '2px solid rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
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
        <X size={20} />
      </button>

      {/* Modal Container */}
      <div className="modal-content" style={{
        backgroundColor: 'rgba(39, 39, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: 'min(800px, calc(100vw - 2rem))',
        maxHeight: 'calc(100vh - 2rem)',
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
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <AlertTriangle size={32} color="var(--destructive)" />
              </div>
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
                fontFamily: 'var(--font-display)'
              }}>
                {pinData.title}
              </h2>
              {pinData.category && CategoryIcon && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <CategoryIcon size={14} /> {getCategoryLabel(pinData.category)}
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
                    border: '2px solid var(--border)'
                  }}>
                    <User size={22} color="var(--muted-foreground)" />
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flex: 1
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Created by
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}>
                      @{pinData.creator_username || 'anonymous'}
                    </div>
                  </div>
                  <FollowButton
                    userId={pinData.creator_id}
                    username={pinData.creator_username}
                    size="small"
                  />
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
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Location
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
                  {pinData.latitude.toFixed(4)}, {pinData.longitude.toFixed(4)}
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
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Collection
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
                  fontFamily: 'var(--font-body)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {pinData.collection_is_public ? 'Public' : 'Private'}
                </div>
              </div>

              {/* About Card - Google's own description of the place */}
              {(pinData as any).editorial_summary && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    About
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {(pinData as any).editorial_summary}
                  </div>
                </div>
              )}

              {/* Notes Card - the user's own text, kept separate from
                  Google's About card above so neither ever overwrites the other */}
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
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Notes
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

              {/* Google Places Enriched Data Cards */}
              {(pinData as any).business_status && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Business Status
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: getBusinessStatusDisplay((pinData as any).business_status).color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    ● {getBusinessStatusDisplay((pinData as any).business_status).text}
                  </div>
                </div>
              )}

              {/* Rating Card */}
              {(pinData as any).rating && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Rating
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#f59e0b',
                    marginBottom: '0.25rem'
                  }}>
                    {formatRating((pinData as any).rating)}
                  </div>
                  {(pinData as any).rating_count && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)'
                    }}>
                      Based on {(pinData as any).rating_count.toLocaleString()} reviews
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information Card */}
              {((pinData as any).phone_number || (pinData as any).website) && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem'
                  }}>
                    Contact
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {(pinData as any).phone_number && (
                      <a
                        href={`tel:${formatPhoneForLink((pinData as any).phone_number)}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          border: '2px solid #22c55e',
                          borderRadius: 'var(--radius)',
                          color: '#22c55e',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'var(--transition)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'
                        }}
                      >
                        <Phone size={16} /> {(pinData as any).phone_number}
                      </a>
                    )}
                    {(pinData as any).website && (
                      <a
                        href={(pinData as any).website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '2px solid #3b82f6',
                          borderRadius: 'var(--radius)',
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'var(--transition)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                        }}
                      >
                        <Globe size={16} /> Visit Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Price Level Card */}
              {(pinData as any).price_level !== null && (pinData as any).price_level !== undefined && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem'
                  }}>
                    Price Level
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#22c55e'
                  }}>
                    {formatPriceLevel((pinData as any).price_level)}
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
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Created: {formatDate(pinData.created_at)}
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
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem'
                }}>
                  All Images ({images.length})
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
                  fontFamily: 'var(--font-body)',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
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
                <Navigation size={16} /> Get Directions
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
                  fontFamily: 'var(--font-body)',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
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
                <Share2 size={16} /> Share Pin
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
                    fontFamily: 'var(--font-body)',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(224, 92, 58, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Pencil size={16} /> Edit Pin
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
          fontFamily: 'var(--font-body)',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1002,
          animation: 'slideUp 0.3s ease'
        }}>
          <Check size={16} /> Link copied to clipboard!
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
