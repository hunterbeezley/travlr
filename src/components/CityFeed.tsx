'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { Globe, Users, Building2, MapPin } from 'lucide-react'
import { DatabaseService, CityFeedCollection, CityWithCollections } from '@/lib/database'
import CollectionDetailsModal from './CollectionDetailsModal'

interface CityFeedProps {
  userId: string
}

type SortOption = 'recent' | 'popular' | 'top_rated'

export default function CityFeed({ userId }: CityFeedProps) {
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
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--muted-foreground)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-body)'
      }}>
        Loading cities...
      </div>
    )
  }

  if (cities.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          marginBottom: '1rem',
          color: 'var(--muted-foreground)'
        }}>
          <Globe size={48} />
        </div>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          fontFamily: 'var(--font-body)'
        }}>
          No Cities Yet
        </h3>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem',
          maxWidth: '400px'
        }}>
          Start adding pins with locations to see city-based collections here.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header and Filters */}
      <div style={{
        padding: '1rem',
        borderBottom: '2px solid var(--border)',
        background: 'var(--background)',
        flexShrink: 0
      }}>
        {/* Title */}
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          marginBottom: '1rem',
          fontFamily: 'var(--font-body)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Globe size={20} />
          City Feed
        </h2>

        {/* City Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--muted-foreground)'
          }}>
            Select City
          </label>
          <select
            value={selectedCity || ''}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer'
            }}
          >
            {cities.map((city) => (
              <option key={`${city.city}-${city.state}`} value={city.city}>
                {city.city}{city.state ? `, ${city.state}` : ''} ({city.collection_count} collections)
              </option>
            ))}
          </select>
        </div>

        {/* Sort and Filter Options */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '0.5rem 0.75rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-body)',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="popular">Popular</option>
            <option value="recent">Recent</option>
            <option value="top_rated">Top Rated</option>
          </select>

          {/* Friends Only Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: friendsOnly ? 'rgba(99, 102, 241, 0.1)' : 'var(--background)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-body)',
            fontWeight: '700',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="checkbox"
              checked={friendsOnly}
              onChange={(e) => setFriendsOnly(e.target.checked)}
              style={{
                cursor: 'pointer'
              }}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <Users size={14} />
              Friends Only
            </span>
          </label>
        </div>
      </div>

      {/* Collections Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem'
      }}>
        {loadingCollections ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)'
          }}>
            Loading collections...
          </div>
        ) : collections.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '1rem',
              color: 'var(--muted-foreground)',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Building2 size={32} />
            </div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)'
            }}>
              No Collections Found
            </h3>
            <p style={{
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem'
            }}>
              {friendsOnly
                ? 'Your friends haven\'t created any collections in this city yet.'
                : 'No public collections in this city yet.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1rem'
          }}>
            {collections.map((collection) => (
              <div
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
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Collection Image */}
                {collection.first_pin_image ? (
                  <div style={{
                    aspectRatio: '16/9',
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
                    aspectRatio: '16/9',
                    background: `linear-gradient(135deg, ${collection.color} 0%, ${collection.color}dd 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <MapPin size={40} />
                  </div>
                )}

                {/* Collection Info */}
                <div style={{ padding: '1rem' }}>
                  {/* Title */}
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {collection.title}
                  </h3>

                  {/* Creator */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    {collection.user_profile_image ? (
                      <img
                        src={collection.user_profile_image}
                        alt={collection.username}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '2px solid var(--border)',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        border: '2px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.625rem',
                        fontWeight: '700',
                        color: 'white'
                      }}>
                        {collection.username[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-body)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {collection.username}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-body)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} />
                      {collection.pin_count}
                    </div>
                    {collection.net_score !== 0 && (
                      <div style={{
                        color: collection.net_score > 0 ? '#22c55e' : '#ef4444',
                        fontWeight: '700'
                      }}>
                        {collection.net_score > 0 ? '+' : ''}{collection.net_score}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
