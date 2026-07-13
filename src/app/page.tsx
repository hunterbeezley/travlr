'use client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BentoFeedCard from '@/components/Feed/BentoFeedCard'
import FeedFilters from '@/components/Feed/FeedFilters'
import FeedSkeleton from '@/components/Feed/FeedSkeleton'
import FollowingSuggestions from '@/components/Feed/FollowingSuggestions'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import Auth from '@/components/Auth'
import EmptyState from '@/components/EmptyState'
import FeedEmptyState from '@/components/Feed/FeedEmptyState'
import { Activity, Sparkles, Users, Building2, TrendingUp, MapPin, Folder } from 'lucide-react'

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'activity' | 'foryou' | 'discover'>('activity')
  const [filter, setFilter] = useState<'all' | 'friends' | 'self'>('all')
  const [followingCount, setFollowingCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Discover tab state
  const [trendingCollections, setTrendingCollections] = useState<any[]>([])
  const [nearbyCollections, setNearbyCollections] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [loadingCities, setLoadingCities] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showAllCities, setShowAllCities] = useState(false)

  // Load following count
  useEffect(() => {
    if (!user) return

    const loadFollowingCount = async () => {
      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setFollowingCount(count || 0)
    }

    loadFollowingCount()
  }, [user])

  // Fallback: Load user's own collections as feed activity
  const loadFallbackFeed = async (offset = 0) => {
    if (!user) return

    try {
      // Get user's collections
      const { data: userCollections, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + 19)

      if (error) throw error
      if (!userCollections || userCollections.length === 0) {
        setActivities([])
        setHasMore(false)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('username, full_name, profile_image')
        .eq('id', user.id)
        .single()

      // Format as feed activities
      const activities = await Promise.all(
        userCollections.map(async (collection) => {
          // Get stats
          const { data: stats } = await supabase.rpc('get_collection_stats', {
            p_collection_id: collection.id
          })

          // Get pin count and sample images
          const { count: pinCount } = await supabase
            .from('pins')
            .select('id', { count: 'exact', head: true })
            .eq('collection_id', collection.id)

          const { data: samplePins } = await supabase
            .from('pins')
            .select('image_url')
            .eq('collection_id', collection.id)
            .not('image_url', 'is', null)
            .limit(3)

          // Fetch all pins with lat/lng for map rendering in Bento card
          const { data: allPins } = await supabase
            .from('pins')
            .select('latitude, longitude')
            .eq('collection_id', collection.id)

          return {
            id: `collection-${collection.id}`,
            activity_type: 'collection_created',
            user_id: user.id,
            username: profile?.username,
            full_name: profile?.full_name,
            avatar_url: profile?.profile_image,
            target_type: 'collection',
            target_id: collection.id,
            created_at: collection.created_at,
            target_data: {
              id: collection.id,
              title: collection.title,
              description: collection.description,
              user_id: collection.user_id,
              created_at: collection.created_at,
              pin_count: pinCount || 0,
              sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
              pins: allPins || [],
              stats
            }
          }
        })
      )

      if (offset === 0) {
        setActivities(activities)
      } else {
        setActivities(prev => [...prev, ...activities])
      }
      setHasMore(activities.length === 20)
    } catch (error) {
      logger.error('Error loading fallback feed:', error)
      setActivities([])
      setHasMore(false)
    }
  }

  // Load feed
  const loadFeed = async (offset = 0) => {
    if (!user) return

    try {
      // Verify session exists
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        logger.error('No session found')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_user_feed', {
        p_limit: 20,
        p_offset: offset,
        p_filter: filter
      })

      if (error) {
        logger.error('Feed RPC error:', error)
        // Fallback: Show user's own collections as activity
        await loadFallbackFeed(offset)
        return
      }
      if (!data || data.length === 0) {
        // Fallback: Show user's own collections as activity
        await loadFallbackFeed(offset)
        return
      }

      // Enrich activities with collection/user data
      const enriched = await Promise.all(
        data.map(async (activity: any) => {
          if (activity.target_type === 'collection') {
            const { data: collection } = await supabase
              .from('collections')
              .select('id, title, description, user_id, created_at')
              .eq('id', activity.target_id)
              .single()

            if (collection) {
              // Get stats
              const { data: stats } = await supabase.rpc('get_collection_stats', {
                p_collection_id: collection.id
              })

              // Get pin count and sample images
              const { count: pinCount } = await supabase
                .from('pins')
                .select('id', { count: 'exact', head: true })
                .eq('collection_id', collection.id)

              const { data: samplePins } = await supabase
                .from('pins')
                .select('image_url')
                .eq('collection_id', collection.id)
                .not('image_url', 'is', null)
                .limit(3)

              // Fetch all pins with lat/lng for map rendering in Bento card
              const { data: allPins } = await supabase
                .from('pins')
                .select('latitude, longitude')
                .eq('collection_id', collection.id)

              return {
                ...activity,
                target_data: {
                  ...collection,
                  pin_count: pinCount || 0,
                  sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
                  pins: allPins || [],
                  stats
                }
              }
            }
          }
          return activity
        })
      )

      if (offset === 0) {
        setActivities(enriched)
      } else {
        setActivities(prev => [...prev, ...enriched])
      }
      setHasMore(enriched.length === 20)
    } catch (error) {
      logger.error('Error loading feed:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Load For You feed
  const loadForYouFeed = async (offset = 0) => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('get_for_you_feed', {
        p_limit: 20,
        p_offset: offset
      })

      if (error || !data || data.length === 0) {
        if (error) logger.error('For You RPC error:', error)
        // Fallback: Show featured/popular collections
        await loadForYouFallback(offset)
        return
      }

      // Enrich with sample images
      const enriched = await Promise.all(
        data.map(async (collection: any) => {
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

      if (offset === 0) {
        setCollections(enriched)
      } else {
        setCollections(prev => [...prev, ...enriched])
      }
      setHasMore(enriched.length === 20)
    } catch (error) {
      logger.error('Error loading For You feed:', error)
      await loadForYouFallback(offset)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Fallback: Show featured collections from all users
  const loadForYouFallback = async (offset = 0) => {
    try {
      const { data, error } = await supabase.rpc('get_featured_collections', {
        p_limit: 20
      })

      if (error) throw error
      if (!data || data.length === 0) {
        // Final fallback: just get recent public collections
        const { data: recentCollections } = await supabase
          .from('collections')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .range(offset, offset + 19)

        if (recentCollections) {
          const enriched = await enrichCollections(recentCollections)
          setCollections(enriched)
          setHasMore(enriched.length === 20)
        }
        return
      }

      const enriched = await enrichCollections(data)
      if (offset === 0) {
        setCollections(enriched)
      } else {
        setCollections(prev => [...prev, ...enriched])
      }
      setHasMore(enriched.length === 20)
    } catch (error) {
      logger.error('Error loading For You fallback:', error)
      setCollections([])
      setHasMore(false)
    }
  }

  // Helper to enrich collections
  const enrichCollections = async (collections: any[]) => {
    return Promise.all(
      collections.map(async (collection: any) => {
        const collectionId = collection.collection_id || collection.id

        const { data: samplePins } = await supabase
          .from('pins')
          .select('image_url')
          .eq('collection_id', collectionId)
          .not('image_url', 'is', null)
          .limit(3)

        const { data: stats } = await supabase.rpc('get_collection_stats', {
          p_collection_id: collectionId
        })

        const { count: pinCount } = await supabase
          .from('pins')
          .select('id', { count: 'exact', head: true })
          .eq('collection_id', collectionId)

        return {
          ...collection,
          collection_id: collectionId,
          collection_name: collection.collection_name || collection.name,
          collection_description: collection.collection_description || collection.description,
          pin_count: pinCount || 0,
          sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
          stats
        }
      })
    )
  }

  // Get user location for nearby collections (Discover tab)
  useEffect(() => {
    if (navigator.geolocation && view === 'discover') {
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
    }
  }, [view])

  // Load cities (Discover tab)
  useEffect(() => {
    if (!user || view !== 'discover') return

    const loadCities = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingCities(false)
          return
        }

        const { data, error } = await supabase.rpc('get_popular_cities', {
          p_limit: 30
        })

        if (error || !data || data.length === 0) {
          // Fallback: Get cities from pins table
          logger.log('Using fallback for cities')
          const { data: pins } = await supabase
            .from('pins')
            .select('city')
            .not('city', 'is', null)

          if (pins) {
            const cityMap = new Map()
            pins.forEach((pin: any) => {
              if (pin.city) {
                cityMap.set(pin.city, (cityMap.get(pin.city) || 0) + 1)
              }
            })

            const citiesData = Array.from(cityMap.entries())
              .map(([city, count]) => ({ city, collection_count: count }))
              .sort((a, b) => b.collection_count - a.collection_count)
              .slice(0, 30)

            setCities(citiesData)
          }
        } else {
          setCities(data)
        }
      } catch (error) {
        logger.error('Error loading cities:', error)
      } finally {
        setLoadingCities(false)
      }
    }

    loadCities()
  }, [user, view])

  // Load trending collections (Discover tab)
  useEffect(() => {
    if (!user || view !== 'discover') return

    const loadTrending = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingTrending(false)
          return
        }

        const { data, error } = await supabase.rpc('get_trending_collections', {
          p_limit: 6,
          p_offset: 0,
          p_days: 7
        })

        if (error || !data || data.length === 0) {
          // Fallback: Get recent public collections
          logger.log('Using fallback for trending collections')
          const { data: collections } = await supabase
            .from('collections')
            .select('id, title, description, created_at, user_id, is_public')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(6)

          if (collections) {
            const enrichedWithUsers = await Promise.all(
              collections.map(async (col: any) => {
                const { data: userInfo } = await supabase
                  .from('users')
                  .select('username, profile_image')
                  .eq('id', col.user_id)
                  .single()

                return {
                  collection_id: col.id,
                  collection_name: col.title,
                  collection_description: col.description,
                  created_at: col.created_at,
                  user_id: col.user_id,
                  username: userInfo?.username,
                  avatar_url: userInfo?.profile_image
                }
              })
            )

            const enriched = await enrichCollections(enrichedWithUsers)
            setTrendingCollections(enriched)
          }
        } else {
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
  }, [user, view])

  // Load nearby collections when location is available (Discover tab)
  useEffect(() => {
    if (!user || !userLocation || view !== 'discover') return

    const loadNearby = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadingNearby(false)
          return
        }

        const { data, error } = await supabase.rpc('get_nearby_collections', {
          p_lat: userLocation.lat,
          p_lng: userLocation.lng,
          p_radius_km: 50,
          p_limit: 6,
          p_offset: 0
        })

        if (error || !data || data.length === 0) {
          // Fallback: Get recent public collections
          logger.log('Using fallback for nearby collections')
          const { data: collections } = await supabase
            .from('collections')
            .select('id, title, description, created_at, user_id, is_public')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(6)

          if (collections) {
            const enrichedWithUsers = await Promise.all(
              collections.map(async (col: any) => {
                const { data: userInfo } = await supabase
                  .from('users')
                  .select('username, profile_image')
                  .eq('id', col.user_id)
                  .single()

                return {
                  collection_id: col.id,
                  collection_name: col.title,
                  collection_description: col.description,
                  created_at: col.created_at,
                  user_id: col.user_id,
                  username: userInfo?.username,
                  avatar_url: userInfo?.profile_image
                }
              })
            )

            const enriched = await enrichCollections(enrichedWithUsers)
            setNearbyCollections(enriched)
          }
        } else {
          const enriched = await enrichCollections(data)
          setNearbyCollections(enriched)
        }
      } catch (error) {
        logger.error('Error loading nearby:', error)
      } finally {
        setLoadingNearby(false)
      }
    }

    loadNearby()
  }, [user, userLocation, view])

  useEffect(() => {
    if (user) {
      setLoading(true)
      if (view === 'activity') {
        loadFeed()
      } else if (view === 'foryou') {
        loadForYouFeed()
      } else {
        // Discover tab doesn't need initial loading (done by individual useEffects)
        setLoading(false)
      }
    }
  }, [user, filter, view])

  const handleLoadMore = () => {
    setLoadingMore(true)
    if (view === 'activity') {
      loadFeed(activities.length)
    } else {
      loadForYouFeed(collections.length)
    }
  }

  const handleCityClick = (city: string) => {
    router.push(`/explore/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, '-'))}`)
  }


  // Categories removed - collections don't have categories (only pins do)

  const displayCities = showAllCities ? cities : cities.slice(0, 12)

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <FeedSkeleton />
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
        paddingTop: '5rem',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' // Account for mobile nav
      }}>
        {/* Header */}
      <div style={{
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            margin: 0
          }}>
            Feed
          </h1>
          {view === 'activity' && (
            <FeedFilters
              filter={filter}
              onFilterChange={setFilter}
              followingCount={followingCount}
            />
          )}
        </div>

        {/* View Switcher - Tidal-style pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--card-elevated)',
          padding: '0.375rem',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-sm)',
          overflowX: 'auto'
        }}>
          {[
            { value: 'activity', label: 'Following' },
            { value: 'foryou', label: 'For You' },
            { value: 'discover', label: 'Discover' }
          ].map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value as any)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: view === v.value ? 'var(--accent)' : 'transparent',
                color: view === v.value ? 'white' : 'var(--muted-foreground)',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (view !== v.value) {
                  e.currentTarget.style.background = 'var(--surface-subtle)'
                }
              }}
              onMouseLeave={(e) => {
                if (view !== v.value) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {v.value === 'activity' && <Users size={16} />}
              {v.value === 'foryou' && <Sparkles size={16} />}
              {v.value === 'discover' && <Activity size={16} />}
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity View */}
      {view === 'activity' && (
        <>
          {/* Empty State */}
          {activities.length === 0 && (
            filter === 'friends' && followingCount === 0 ? (
              <FeedEmptyState
                icon={Users}
                title="Follow People to See Their Activity"
                description="Your feed will come alive with collections, pins, and updates from people you follow. Start building your travel community!"
                actions={[
                  { label: 'Find People to Follow', href: '/friends', variant: 'primary' },
                  { label: 'Explore Collections', onClick: () => setView('discover'), variant: 'secondary' }
                ]}
                tips={[
                  'Follow travelers with similar interests',
                  'Like collections to show appreciation',
                  'Comment to start conversations',
                  'Save collections to revisit them later'
                ]}
              />
            ) : (
              <FeedEmptyState
                icon={Activity}
                title="Start Your Travel Journey"
                description="Create your first collection and add pins to share your favorite places with the world. Your travel story begins here!"
                actions={[
                  { label: 'Create Your First Collection', href: '/map', variant: 'primary' },
                  { label: 'Explore Other Collections', onClick: () => setView('discover'), variant: 'secondary' }
                ]}
                tips={[
                  'Double-click the map to add a pin',
                  'Organize pins into themed collections',
                  'Add photos and descriptions to make pins memorable',
                  'Share collections with friends and family'
                ]}
              />
            )
          )}

          {/* Feed Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activities.map((activity) => (
              <BentoFeedCard
                key={activity.id}
                activity={activity}
                currentUserId={user.id}
              />
            ))}
          </div>
        </>
      )}

      {/* For You View */}
      {view === 'foryou' && (
        <>
          {/* Following Suggestions */}
          <FollowingSuggestions />

          {collections.length === 0 ? (
            <FeedEmptyState
              icon={Sparkles}
              title="Building Your Personalized Feed"
              description="We're curating content based on your interests. Engage with collections you love to help us understand your travel style!"
              actions={[
                { label: 'Explore Collections', onClick: () => setView('discover'), variant: 'primary' },
                { label: 'Follow Travelers', href: '/friends', variant: 'secondary' }
              ]}
              tips={[
                'Like collections that match your interests',
                'Save collections to build your travel wishlist',
                'Follow users with similar travel styles',
                'The more you engage, the better your recommendations'
              ]}
            />
          ) : (
            <div style={{ maxWidth: '1200px' }}>
              <CollectionGrid collections={collections} currentUserId={user.id} />
            </div>
          )}
        </>
      )}

      {/* Discover View */}
      {view === 'discover' && (
        <>
          {/* SECTION: Explore by City */}
          <section style={{
            marginBottom: '2.5rem',
            padding: '1.5rem',
            background: 'var(--card-elevated)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                <Building2 size={20} style={{ color: 'var(--accent)' }} />
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  {displayCities.map((city) => (
                    <button
                      key={city.city}
                      onClick={() => handleCityClick(city.city)}
                      style={{
                        padding: '1rem',
                        background: 'var(--surface-subtle)',
                        border: 'none',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--muted)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-subtle)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <Building2 size={24} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{city.city}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--muted-foreground)'
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
                      padding: '0.875rem',
                      background: 'var(--muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      color: 'var(--foreground)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent)'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--muted)'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }}
                  >
                    {showAllCities ? 'Show Less' : `Show All ${cities.length} Cities`}
                  </button>
                )}
              </>
            )}
          </section>

          {/* SECTION: Trending This Week */}
          <section style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0
              }}>
                <TrendingUp size={20} style={{ color: '#f97316' }} />
                <span>Trending This Week</span>
              </h2>
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
                background: 'var(--card-elevated)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <TrendingUp size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
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
            <section style={{ marginBottom: '2.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0
                }}>
                  <MapPin size={20} style={{ color: 'var(--accent)' }} />
                  <span>Nearby Collections</span>
                </h2>
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
                  background: 'var(--card-elevated)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <MapPin size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
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

          {/* Category section removed - collections don't have categories (only pins do) */}
          {/* Use search page to discover collections instead */}
        </>
      )}


      {/* Load More */}
      {hasMore && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '0.875rem 2.5rem',
              background: loadingMore ? 'var(--muted)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: loadingMore ? 'none' : 'var(--shadow-glow)',
              transition: 'all 0.2s ease'
            }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
    </>
  )
}
