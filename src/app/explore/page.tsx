'use client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import Auth from '@/components/Auth'

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [trendingCollections, setTrendingCollections] = useState<any[]>([])
  const [nearbyCollections, setNearbyCollections] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [loadingCities, setLoadingCities] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showAllCities, setShowAllCities] = useState(false)

  // Get user location for nearby collections
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          logger.log('Location access denied:', error)
          setLoadingNearby(false)
        }
      )
    } else {
      setLoadingNearby(false)
    }
  }, [])

  // Load cities
  useEffect(() => {
    const loadCities = async () => {
      if (!user) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingCities(false)
          return
        }

        const { data, error } = await supabase.rpc('get_popular_cities', {
          p_limit: 30
        })

        if (error) throw error
        setCities(data || [])
      } catch (error) {
        logger.error('Error loading cities:', error)
      } finally {
        setLoadingCities(false)
      }
    }

    loadCities()
  }, [user])

  // Load trending collections
  useEffect(() => {
    const loadTrending = async () => {
      if (!user) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingTrending(false)
          return
        }

        const { data } = await supabase.rpc('get_trending_collections', {
          p_limit: 6,
          p_offset: 0,
          p_days: 7
        })

        if (data) {
          const enriched = await enrichCollections(data)
          setTrendingCollections(enriched)
        }
      } catch (error) {
        logger.error('Error loading trending:', error)
      } finally {
        setLoadingTrending(false)
      }
    }

    loadTrending()
  }, [user])

  // Load nearby collections when location is available
  useEffect(() => {
    const loadNearby = async () => {
      if (!user || !userLocation) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingNearby(false)
          return
        }

        const { data } = await supabase.rpc('get_nearby_collections', {
          p_lat: userLocation.lat,
          p_lng: userLocation.lng,
          p_radius_km: 50,
          p_limit: 6,
          p_offset: 0
        })

        if (data) {
          const enriched = await enrichCollections(data)
          setNearbyCollections(enriched)
        }
      } catch (error) {
        logger.error('Error loading nearby:', error)
      } finally {
        setLoadingNearby(false)
      }
    }

    if (userLocation) {
      loadNearby()
    }
  }, [user, userLocation])

  // Helper to enrich collections with images and stats
  const enrichCollections = async (collections: any[]) => {
    return Promise.all(
      collections.map(async (collection: any) => {
        const { data: samplePins } = await supabase
          .from('pins')
          .select('image_url')
          .eq('collection_id', collection.collection_id)
          .not('image_url', 'is', null)
          .limit(3)

        const { data: stats } = await supabase.rpc('get_collection_stats', {
          p_collection_id: collection.collection_id
        })

        return {
          ...collection,
          sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
          stats
        }
      })
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleCityClick = (city: string) => {
    router.push(`/explore/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}`)
  }

  // Popular categories
  const popularCategories = [
    '☕ Restaurants',
    '🍺 Bars',
    '🏨 Hotels',
    '🎭 Entertainment',
    '🛍️ Shopping',
    '🏛️ Culture',
    '🌳 Outdoors',
    '🏃 Activities'
  ]

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  const displayCities = showAllCities ? cities : cities.slice(0, 12)

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
        {/* Header with Search */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem'
          }}>
            Explore Collections
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search collections, places, or categories..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'var(--muted)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--accent)',
                color: 'white',
                border: '2px solid var(--accent)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* SECTION: Explore by City */}
        <section style={{
          marginBottom: '3rem',
          padding: '1.5rem',
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid var(--border)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              <span>🌆</span>
              <span>Explore by City</span>
            </h2>
          </div>

          {loadingCities ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem'
            }}>
              Loading cities...
            </div>
          ) : cities.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem'
            }}>
              No cities available yet
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                {displayCities.map((city) => (
                  <button
                    key={city.city}
                    onClick={() => handleCityClick(city.city)}
                    style={{
                      padding: '1rem',
                      background: 'var(--muted)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'left',
                      transition: 'var(--transition)'
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
                    <div style={{
                      fontSize: '1.5rem',
                      marginBottom: '0.5rem'
                    }}>🌆</div>
                    <div style={{
                      fontWeight: '700',
                      marginBottom: '0.25rem'
                    }}>{city.city}</div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--muted-foreground)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {city.collection_count} {city.collection_count === 1 ? 'collection' : 'collections'}
                    </div>
                  </button>
                ))}
              </div>

              {cities.length > 12 && (
                <button
                  onClick={() => setShowAllCities(!showAllCities)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--background)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'var(--transition)',
                    color: 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  {showAllCities ? 'Show Less' : `Show All ${cities.length} Cities`}
                </button>
              )}
            </>
          )}
        </section>

        {/* SECTION: Trending This Week */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid var(--border)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              <span>🔥</span>
              <span>Trending This Week</span>
            </h2>
            {trendingCollections.length > 0 && (
              <Link
                href="/explore/trending"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                View All →
              </Link>
            )}
          </div>

          {loadingTrending ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem'
            }}>
              Loading trending collections...
            </div>
          ) : trendingCollections.length === 0 ? (
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              background: 'var(--muted)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔥</div>
              <p style={{
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem'
              }}>
                No trending collections yet
              </p>
            </div>
          ) : (
            <CollectionGrid collections={trendingCollections} currentUserId={user.id} />
          )}
        </section>

        {/* SECTION: Nearby Collections */}
        {userLocation && (
          <section style={{ marginBottom: '3rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid var(--border)'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                <span>📍</span>
                <span>Nearby Collections</span>
              </h2>
              {nearbyCollections.length > 0 && (
                <Link
                  href="/explore/nearby"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  View All →
                </Link>
              )}
            </div>

            {loadingNearby ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem'
              }}>
                Loading nearby collections...
              </div>
            ) : nearbyCollections.length === 0 ? (
              <div style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  No nearby collections within 50km
                </p>
              </div>
            ) : (
              <CollectionGrid collections={nearbyCollections} currentUserId={user.id} />
            )}
          </section>
        )}

        {/* SECTION: Browse by Category */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid var(--border)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0
            }}>
              <span>📂</span>
              <span>Browse by Category</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem'
          }}>
            {popularCategories.map((category) => (
              <Link
                key={category}
                href={`/explore/category/${encodeURIComponent(category.split(' ')[1].toLowerCase())}`}
                style={{
                  padding: '1rem',
                  background: 'var(--muted)',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textDecoration: 'none',
                  color: 'var(--foreground)',
                  textAlign: 'center',
                  transition: 'var(--transition)',
                  display: 'block'
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
                {category}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
