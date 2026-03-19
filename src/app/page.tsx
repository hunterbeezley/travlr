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

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<any[]>([])
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'activity' | 'foryou'>('activity')
  const [filter, setFilter] = useState<'all' | 'friends' | 'self'>('all')
  const [followingCount, setFollowingCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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
        .from('profiles')
        .select('username, full_name, avatar_url')
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
            avatar_url: profile?.avatar_url,
            target_type: 'collection',
            target_id: collection.id,
            created_at: collection.created_at,
            target_data: {
              id: collection.id,
              name: collection.name,
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
              .select('id, name, description, user_id, created_at')
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

  useEffect(() => {
    if (user) {
      setLoading(true)
      if (view === 'activity') {
        loadFeed()
      } else {
        loadForYouFeed()
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
        {/* Header */}
      <div style={{
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
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

        {/* View Switcher */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--muted)',
          padding: '0.25rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)'
        }}>
          {[
            { value: 'activity', label: 'Activity', icon: '📱' },
            { value: 'foryou', label: 'For You', icon: '✨' }
          ].map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value as any)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: view === v.value ? 'var(--accent)' : 'transparent',
                color: view === v.value ? 'white' : 'var(--foreground)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (view !== v.value) {
                  e.currentTarget.style.background = 'var(--background)'
                }
              }}
              onMouseLeave={(e) => {
                if (view !== v.value) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span>{v.icon}</span>
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
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              background: 'var(--muted)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-mono)'
              }}>
                {filter === 'friends' && followingCount === 0
                  ? 'Follow People to See Their Activity'
                  : 'No Activity Yet'}
              </h3>
              <p style={{
                color: 'var(--muted-foreground)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                {filter === 'friends' && followingCount === 0
                  ? 'Start following people to see their collections and activity in your feed.'
                  : 'Create collections and add pins to see activity here.'}
              </p>
              {filter === 'friends' && followingCount === 0 && (
                <Link
                  href="/friends"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.875rem'
                  }}
                >
                  Find People
                </Link>
              )}
            </div>
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
            <div style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              background: 'var(--muted)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-mono)'
              }}>
                Building Your Personalized Feed
              </h3>
              <p style={{
                color: 'var(--muted-foreground)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem'
              }}>
                Like and save collections to help us learn your preferences.
              </p>
              <Link
                href="/explore"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.875rem'
                }}
              >
                Explore Collections
              </Link>
            </div>
          ) : (
            <div style={{ maxWidth: '1200px' }}>
              <CollectionGrid collections={collections} currentUserId={user.id} />
            </div>
          )}
        </>
      )}

      {/* Load More */}
      {hasMore && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '0.75rem 2rem',
              background: loadingMore ? 'var(--muted)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.875rem'
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
