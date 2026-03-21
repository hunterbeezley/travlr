'use client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import FeedCard from '@/components/Feed/FeedCard'
import FeedFilters from '@/components/Feed/FeedFilters'
import FeedSkeleton from '@/components/Feed/FeedSkeleton'
import FollowingSuggestions from '@/components/Feed/FollowingSuggestions'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import Auth from '@/components/Auth'
import EmptyState from '@/components/EmptyState'
import UserAvatar from '@/components/UserAvatar'
import { Activity, Sparkles, Users, Search, Building2, TrendingUp, MapPin, Folder } from 'lucide-react'

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'activity' | 'foryou' | 'discover' | 'search'>('activity')
  const [filter, setFilter] = useState<'all' | 'friends' | 'self'>('all')
  const [followingCount, setFollowingCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTab, setSearchTab] = useState<'collections' | 'users'>('collections')
  const [searchCollections, setSearchCollections] = useState<any[]>([])
  const [searchUsers, setSearchUsers] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchFollowing, setSearchFollowing] = useState<Set<string>>(new Set())

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

              return {
                ...activity,
                target_data: {
                  ...collection,
                  pin_count: pinCount || 0,
                  sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
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
        // Discover and Search tabs don't need initial loading (done by individual useEffects)
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

  // Search functions
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchCollections([])
      setSearchUsers([])
      return
    }

    setSearchLoading(true)
    try {
      if (searchTab === 'collections') {
        const { data, error } = await supabase.rpc('search_collections', {
          search_query: query.trim(),
          filter_category: null,
          filter_location: null,
          sort_by: 'relevance',
          result_limit: 50
        })
        if (error) throw error
        setSearchCollections(data || [])
      } else {
        const { data, error } = await supabase.rpc('search_users', {
          search_query: query.trim(),
          result_limit: 50
        })
        if (error) throw error
        setSearchUsers(data || [])
      }
    } catch (error) {
      logger.error('Error searching:', error)
      setSearchCollections([])
      setSearchUsers([])
    } finally {
      setSearchLoading(false)
    }
  }

  const loadSearchFollowing = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
      if (error) throw error
      setSearchFollowing(new Set(data?.map((f: any) => f.following_id) || []))
    } catch (error) {
      logger.error('Error loading following state:', error)
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: user?.id, following_id: userId })
      if (error) throw error
      setSearchFollowing(prev => new Set(prev).add(userId))
    } catch (error) {
      logger.error('Error following user:', error)
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user?.id)
        .eq('following_id', userId)
      if (error) throw error
      setSearchFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    } catch (error) {
      logger.error('Error unfollowing user:', error)
    }
  }

  // Load search following when switching to search view
  useEffect(() => {
    if (view === 'search' && user) {
      loadSearchFollowing()
    }
  }, [view, user])

  // Trigger search when query or tab changes
  useEffect(() => {
    if (view === 'search') {
      performSearch(searchQuery)
    }
  }, [searchQuery, searchTab, view])

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
            { value: 'activity', label: 'Following', Icon: Users },
            { value: 'foryou', label: 'For You', Icon: Sparkles },
            { value: 'discover', label: 'Discover', Icon: Activity },
            { value: 'search', label: 'Search', Icon: Search }
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
              <v.Icon size={16} />
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
              <EmptyState
                icon={Users}
                title="Follow People to See Their Activity"
                description="Start following people to see their collections and activity in your feed."
                actionLabel="Find People"
                actionHref="/friends"
              />
            ) : (
              <EmptyState
                icon={Activity}
                title="No Activity Yet"
                description="Create collections and add pins to see activity here. Your journey starts with your first collection!"
                actionLabel="Create Collection"
                actionHref="/map"
              />
            )
          )}

          {/* Feed Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activities.map((activity) => (
              <FeedCard
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
            <EmptyState
              icon={Sparkles}
              title="Building Your Personalized Feed"
              description="Like and save collections to help us learn your preferences. We'll show you more of what you love!"
              actionLabel="Explore Collections"
              onAction={() => setView('discover')}
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

      {/* Search View */}
      {view === 'search' && (
        <>
          {/* Search Input - Tidal-style pill */}
          <div style={{
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections and users..."
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                paddingLeft: '3.5rem',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                fontSize: '1rem',
                background: 'var(--card-elevated)',
                color: 'var(--foreground)',
                outline: 'none',
                boxShadow: 'var(--shadow)',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-lg), 0 0 0 2px var(--accent)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow)'
              }}
            />
            <Search
              size={20}
              style={{
                position: 'absolute',
                left: '1.25rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)'
              }}
            />
            {searchLoading && (
              <div style={{
                position: 'absolute',
                right: '1.25rem',
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
              </div>
            )}
          </div>

          {/* Search Tabs - Pill style */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            background: 'var(--card-elevated)',
            padding: '0.375rem',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {[
              { value: 'collections', label: 'Collections', Icon: Folder },
              { value: 'users', label: 'Users', Icon: Users }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSearchTab(tab.value as any)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: searchTab === tab.value ? 'var(--accent)' : 'transparent',
                  color: searchTab === tab.value ? 'white' : 'var(--muted-foreground)',
                  border: 'none',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <tab.Icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Results */}
          {searchQuery ? (
            <>
              {/* Collections Results */}
              {searchTab === 'collections' && (
                <>
                  {searchCollections.length === 0 && !searchLoading && (
                    <EmptyState
                      icon={Search}
                      title="No Collections Found"
                      description={`No collections found matching "${searchQuery}"`}
                      variant="subtle"
                    />
                  )}
                  {searchCollections.length > 0 && (
                    <CollectionGrid collections={searchCollections} currentUserId={user.id} />
                  )}
                </>
              )}

              {/* Users Results */}
              {searchTab === 'users' && (
                <>
                  {searchUsers.length === 0 && !searchLoading && (
                    <EmptyState
                      icon={Users}
                      title="No Users Found"
                      description={`No users found matching "${searchQuery}"`}
                      variant="subtle"
                    />
                  )}
                  {searchUsers.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      {searchUsers.map((searchUser: any) => (
                        <div
                          key={searchUser.id}
                          style={{
                            padding: '1.25rem',
                            background: 'var(--card-elevated)',
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem'
                          }}>
                            <div
                              onClick={() => router.push(`/profile/${searchUser.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <UserAvatar
                                profileImageUrl={searchUser.profile_image}
                                email={searchUser.email || searchUser.username || ''}
                                size="large"
                              />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                onClick={() => router.push(`/profile/${searchUser.id}`)}
                                style={{ cursor: 'pointer' }}
                              >
                                <h3 style={{
                                  fontSize: '1rem',
                                  fontWeight: '700',
                                  marginBottom: '0.25rem'
                                }}>
                                  {searchUser.full_name || searchUser.username || searchUser.email}
                                </h3>
                                <p style={{
                                  fontSize: '0.875rem',
                                  color: 'var(--muted-foreground)',
                                  marginBottom: '0.5rem'
                                }}>
                                  {searchUser.username ? `@${searchUser.username}` : searchUser.email}
                                </p>
                              </div>

                              {searchUser.bio && (
                                <p style={{
                                  fontSize: '0.875rem',
                                  color: 'var(--foreground)',
                                  marginBottom: '0.75rem',
                                  lineHeight: '1.5'
                                }}>
                                  {searchUser.bio}
                                </p>
                              )}

                              {searchUser.location && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-foreground)',
                                  marginBottom: '0.75rem'
                                }}>
                                  📍 {searchUser.location}
                                </div>
                              )}

                              <div style={{
                                display: 'flex',
                                gap: '1rem',
                                fontSize: '0.75rem',
                                color: 'var(--muted-foreground)',
                                marginBottom: '0.75rem'
                              }}>
                                <span>👥 {searchUser.follower_count || 0} followers</span>
                                <span>📂 {searchUser.collection_count || 0} collections</span>
                              </div>
                            </div>

                            <button
                              onClick={() => searchFollowing.has(searchUser.id) ? handleUnfollow(searchUser.id) : handleFollow(searchUser.id)}
                              style={{
                                padding: '0.625rem 1.25rem',
                                background: searchFollowing.has(searchUser.id) ? 'var(--muted)' : 'var(--accent)',
                                color: searchFollowing.has(searchUser.id) ? 'var(--muted-foreground)' : 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-pill)',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                boxShadow: searchFollowing.has(searchUser.id) ? 'none' : 'var(--shadow-sm)'
                              }}
                              onMouseEnter={(e) => {
                                if (!searchFollowing.has(searchUser.id)) {
                                  e.currentTarget.style.background = 'var(--accent-hover)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!searchFollowing.has(searchUser.id)) {
                                  e.currentTarget.style.background = 'var(--accent)'
                                }
                              }}
                            >
                              {searchFollowing.has(searchUser.id) ? 'Following' : 'Follow'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--card-elevated)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Search size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                marginBottom: '0.5rem'
              }}>
                Search for Content
              </h3>
              <p style={{
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem'
              }}>
                Find collections and users across Travlr
              </p>
            </div>
          )}
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
