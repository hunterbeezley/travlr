'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { Globe, Users, Building2, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react'
import { DatabaseService, CityFeedCollection, CityWithCollections } from '@/lib/database'
import CollectionDetailsModal from './CollectionDetailsModal'

interface CityFeedTimelineProps {
  userId: string
}

type SortOption = 'recent' | 'popular' | 'top_rated'

export default function CityFeedTimeline({ userId }: CityFeedTimelineProps) {
  const [cities, setCities] = useState<CityWithCollections[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [collections, setCollections] = useState<CityFeedCollection[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [friendsOnly, setFriendsOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<CityFeedCollection | null>(null)

  // Load available cities on mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesData = await DatabaseService.getCitiesWithCollections()
        setCities(citiesData)

        // Auto-select first city if available
        if (citiesData.length > 0) {
          setSelectedCity(citiesData[0].city)
        }
      } catch (err) {
        logger.error('Error loading cities:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCities()
  }, [])

  // Load collections when city or filters change
  useEffect(() => {
    if (!selectedCity) return

    const loadCollections = async () => {
      setLoadingCollections(true)
      try {
        const collectionsData = await DatabaseService.getCollectionsByCity(
          selectedCity,
          sortBy,
          50,
          0,
          friendsOnly
        )
        setCollections(collectionsData)
      } catch (err) {
        logger.error('Error loading collections:', err)
      } finally {
        setLoadingCollections(false)
      }
    }

    loadCollections()
  }, [selectedCity, sortBy, friendsOnly])

  const handleRefresh = () => {
    if (selectedCity) {
      setLoadingCollections(true)
      DatabaseService.getCollectionsByCity(selectedCity, sortBy, 50, 0, friendsOnly)
        .then(setCollections)
        .finally(() => setLoadingCollections(false))
    }
  }

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '3px solid var(--muted)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
          Loading cities...
        </p>
      </div>
    )
  }

  if (cities.length === 0) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2rem', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'center' }}>
          <Globe size={56} />
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '1rem',
          fontFamily: 'var(--font-display)'
        }}>
          No Cities Yet
        </h1>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '1rem',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          Start adding pins with locations to see city-based collections here.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: 'clamp(1rem, 5vw, 2rem)',
      minHeight: 'calc(100vh - 80px)'
    }}>
      {/* Header */}
      <header style={{
        marginBottom: 'clamp(1rem, 4vw, 2rem)',
        paddingBottom: 'clamp(1rem, 4vw, 2rem)',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(0.5rem, 2vw, 1rem)',
          flexWrap: 'wrap'
        }}>
          <Globe size={32} />
          <span>Discover</span>
        </h1>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          fontFamily: 'var(--font-body)'
        }}>
          Explore curated collections from cities around the world
        </p>
      </header>

      {/* Filters Bar */}
      <div style={{
        background: 'var(--muted)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* City Selector */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--foreground)'
          }}>
            <MapPin size={14} />
            Select City
          </label>
          <select
            value={selectedCity || ''}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '1rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {cities.map((city) => (
              <option key={`${city.city}-${city.state}`} value={city.city}>
                {city.city}{city.state ? `, ${city.state}` : ''} · {city.collection_count} collection{city.collection_count !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Sort and Filter Options */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Sort Dropdown */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--foreground)'
            }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <option value="popular">Most Pins</option>
              <option value="recent">Most Recent</option>
              <option value="top_rated">Top Rated</option>
            </select>
          </div>

          {/* Friends Only Toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: friendsOnly ? 'rgba(99, 102, 241, 0.1)' : 'var(--background)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={friendsOnly}
                onChange={(e) => setFriendsOnly(e.target.checked)}
                style={{
                  cursor: 'pointer',
                  width: '18px',
                  height: '18px'
                }}
              />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Users size={16} />
                Friends Only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Collections Feed */}
      {loadingCollections ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid var(--muted)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
            Loading collections...
          </p>
        </div>
      ) : collections.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'var(--muted)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'center' }}>
            <Building2 size={40} />
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-body)'
          }}>
            No Collections Found
          </h3>
          <p style={{
            color: 'var(--muted-foreground)',
            fontSize: '1rem'
          }}>
            {friendsOnly
              ? 'Your friends haven\'t created any collections in this city yet.'
              : 'No public collections in this city yet. Be the first!'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          gap: 'clamp(1rem, 3vw, 1.5rem)'
        }}>
          {collections.map((collection) => (
            <article
              key={collection.id}
              onClick={() => setSelectedCollection(collection)}
              style={{
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: 'var(--background)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Collection Image */}
              {collection.first_pin_image ? (
                <div style={{
                  aspectRatio: '16/10',
                  overflow: 'hidden',
                  background: 'var(--muted)'
                }}>
                  <img
                    src={collection.first_pin_image}
                    alt={collection.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  aspectRatio: '16/10',
                  background: `linear-gradient(135deg, ${collection.color} 0%, ${collection.color}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <MapPin size={56} />
                </div>
              )}

              {/* Collection Content */}
              <div style={{ padding: '1.5rem' }}>
                {/* Title */}
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-body)',
                  lineHeight: '1.3'
                }}>
                  {collection.title}
                </h3>

                {/* Description (if exists) */}
                {collection.description && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                    marginBottom: '1rem',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {collection.description}
                  </p>
                )}

                {/* Creator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border)'
                }}>
                  {collection.user_profile_image ? (
                    <img
                      src={collection.user_profile_image}
                      alt={collection.username}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '2px solid var(--border)',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '2px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: 'white'
                    }}>
                      {collection.username[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      fontFamily: 'var(--font-body)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {collection.username}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)'
                    }}>
                      {collection.city}{collection.state ? `, ${collection.state}` : ''}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: '700'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--foreground)'
                  }}>
                    <MapPin size={16} />
                    <span>{collection.pin_count} pin{collection.pin_count !== 1 ? 's' : ''}</span>
                  </div>
                  {collection.net_score !== 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: collection.net_score > 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {collection.net_score > 0 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                      <span>{collection.net_score > 0 ? '+' : ''}{collection.net_score}</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Collection Details Modal */}
      {selectedCollection && (
        <CollectionDetailsModal
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
          onUpdate={handleRefresh}
          userId={userId}
        />
      )}
    </div>
  )
}
