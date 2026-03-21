'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import UserAvatar from '@/components/UserAvatar'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { FolderOpen, Users, Search } from 'lucide-react'

interface Collection {
  id: string
  title: string
  description: string | null
  location: string | null
  category: string | null
  color: string
  is_public: boolean
  created_at: string
  user_id: string
  pin_count: number
  rank: number
}

interface User {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  email: string
  profile_image: string | null
  location: string | null
  follower_count: number
  collection_count: number
  rank: number
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState<'collections' | 'users'>(
    (searchParams.get('type') as 'collections' | 'users') || 'collections'
  )

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance')

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  // Load following state
  useEffect(() => {
    if (user) {
      loadFollowingState()
    }
  }, [user])

  const loadFollowingState = async () => {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user?.id)

      if (error) throw error
      setFollowing(new Set(data?.map((f: any) => f.following_id) || []))
    } catch (error) {
      logger.error('Error loading following state:', error)
    }
  }

  // Search collections
  const searchCollections = useCallback(async (query: string) => {
    setCollectionsLoading(true)
    try {
      const { data, error } = await supabase.rpc('search_collections', {
        search_query: query.trim(),
        filter_category: categoryFilter || null,
        filter_location: locationFilter || null,
        sort_by: sortBy,
        result_limit: 50
      })

      if (error) throw error
      setCollections(data || [])
    } catch (error) {
      logger.error('Error searching collections:', error)
      setCollections([])
    } finally {
      setCollectionsLoading(false)
    }
  }, [categoryFilter, locationFilter, sortBy])

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    setUsersLoading(true)
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: query.trim(),
        result_limit: 50
      })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      logger.error('Error searching users:', error)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        if (activeTab === 'collections') {
          searchCollections(searchQuery)
        } else {
          searchUsers(searchQuery)
        }
      } else {
        setCollections([])
        setUsers([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, categoryFilter, locationFilter, sortBy, searchCollections, searchUsers])

  // Handle follow/unfollow
  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('follow_user', {
        p_following_id: userId
      })
      if (error) throw error
      setFollowing(prev => new Set(prev).add(userId))
    } catch (error) {
      logger.error('Error following user:', error)
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('unfollow_user', {
        p_following_id: userId
      })
      if (error) throw error
      setFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    } catch (error) {
      logger.error('Error unfollowing user:', error)
    }
  }

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
        paddingTop: '5rem',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' // Space for mobile nav
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem'
          }}>
            🔍 Search
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)'
          }}>
            Discover collections and connect with travelers
          </p>
        </div>

        {/* Search Input */}
        <div style={{
          marginBottom: '2rem',
          position: 'relative'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for collections or users..."
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              paddingLeft: '3.5rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1rem',
              background: 'var(--card)',
              color: 'var(--foreground)',
              outline: 'none',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />
          <div style={{
            position: 'absolute',
            left: '1.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={20} strokeWidth={2} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'var(--muted)',
          padding: '0.25rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setActiveTab('collections')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'collections' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'collections' ? 'white' : 'var(--foreground)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)'
            }}
          >
            📂 Collections {collections.length > 0 && `(${collections.length})`}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'users' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'users' ? 'white' : 'var(--foreground)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)'
            }}
          >
            👥 Users {users.length > 0 && `(${users.length})`}
          </button>
        </div>

        {/* Filters (Collections only) */}
        {activeTab === 'collections' && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="">All Categories</option>
              <option value="food">🍽️ Food & Drink</option>
              <option value="nature">🌲 Nature</option>
              <option value="culture">🎨 Culture</option>
              <option value="adventure">🏔️ Adventure</option>
              <option value="urban">🏙️ Urban</option>
            </select>

            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by location..."
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: '0.875rem'
              }}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'recent' | 'popular')}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="relevance">Most Relevant</option>
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        )}

        {/* Results */}
        {activeTab === 'collections' ? (
          <div>
            {collectionsLoading ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--muted-foreground)' }}>Searching collections...</p>
              </div>
            ) : collections.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title={searchQuery ? 'No Collections Found' : 'Start Searching'}
                description={searchQuery ? 'Try a different search term or adjust your filters to find more collections.' : 'Enter a search term to find collections from travelers around the world.'}
                variant="subtle"
              />
            ) : (
              <CollectionGrid
                collections={collections.map(c => ({
                  ...c,
                  collection_id: c.id
                }))}
                currentUserId={user?.id || ''}
              />
            )}
          </div>
        ) : (
          <div>
            {usersLoading ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--muted-foreground)' }}>Searching users...</p>
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery ? 'No Users Found' : 'Start Searching'}
                description={searchQuery ? 'Try a different search term to find travelers and creators.' : 'Enter a search term to discover and connect with other travelers.'}
                variant="subtle"
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {users.map((searchUser) => (
                  <div
                    key={searchUser.id}
                    style={{
                      padding: '1rem',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'var(--transition)'
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
                            marginBottom: '0.25rem',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase'
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
                          color: 'var(--muted-foreground)'
                        }}>
                          <span>👥 {searchUser.follower_count} followers</span>
                          <span>📂 {searchUser.collection_count} collections</span>
                        </div>
                      </div>

                      {user && user.id !== searchUser.id && (
                        <button
                          onClick={() => following.has(searchUser.id) ? handleUnfollow(searchUser.id) : handleFollow(searchUser.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: following.has(searchUser.id) ? 'var(--muted)' : 'var(--accent)',
                            color: following.has(searchUser.id) ? 'var(--muted-foreground)' : 'white',
                            border: following.has(searchUser.id) ? '1px solid var(--border)' : 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'var(--transition)'
                          }}
                          onMouseEnter={(e) => {
                            if (!following.has(searchUser.id)) {
                              e.currentTarget.style.background = 'var(--accent-hover)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!following.has(searchUser.id)) {
                              e.currentTarget.style.background = 'var(--accent)'
                            }
                          }}
                        >
                          {following.has(searchUser.id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--muted-foreground)' }}>Loading search...</p>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
