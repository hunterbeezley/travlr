'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import UserAvatar from '@/components/UserAvatar'
import Auth from '@/components/Auth'

interface UserSearchResult {
  id: string
  username: string | null
  full_name: string | null
  email: string
  bio: string | null
  profile_image: string | null
  location: string | null
  follower_count?: number
  collection_count?: number
  mutual_friends?: number
  is_following?: boolean
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'search' | 'suggestions'>('suggestions')

  // Load user suggestions and following state on mount
  useEffect(() => {
    if (user) {
      loadSuggestions()
      loadFollowingState()
    }
  }, [user])

  // Load which users the current user is following
  const loadFollowingState = async () => {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user?.id)

      if (error) throw error

      const followingIds = new Set(data?.map((f: any) => f.following_id) || [])
      setFollowing(followingIds)
    } catch (error) {
      logger.error('Error loading following state:', error)
    }
  }

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true)

      // Try to use the RPC function if it exists
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_following_suggestions', { p_limit: 20 })

      if (!rpcError && rpcData) {
        setSuggestions(rpcData)
      } else {
        // Fallback: Get random public users (don't require username)
        const { data, error } = await supabase
          .from('users')
          .select('id, username, full_name, bio, profile_image, location, email')
          .neq('id', user?.id || '')
          .limit(20)

        if (error) throw error
        setSuggestions(data || [])
      }
    } catch (error) {
      logger.error('Error loading suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setLoading(true)

      // Search for users by username, full name, or email
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, bio, profile_image, location, email')
        .neq('id', user?.id || '')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50)

      if (error) throw error

      setSearchResults(data || [])
    } catch (error) {
      logger.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleFollow = async (userId: string) => {
    try {
      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('follow_user', { p_following_id: userId })

      if (rpcError) {
        // Fallback: Direct insert into user_follows table
        logger.log('RPC failed, using fallback for follow')
        const { error: insertError } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user?.id,
            following_id: userId
          })

        if (insertError) throw insertError
      }

      setFollowing(prev => new Set(prev).add(userId))
    } catch (error) {
      logger.error('Error following user:', error)
      alert('Failed to follow user. Please try again.')
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      // Try RPC function first
      const { error: rpcError } = await supabase
        .rpc('unfollow_user', { p_following_id: userId })

      if (rpcError) {
        // Fallback: Direct delete from user_follows table
        logger.log('RPC failed, using fallback for unfollow')
        const { error: deleteError } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user?.id)
          .eq('following_id', userId)

        if (deleteError) throw deleteError
      }

      setFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    } catch (error) {
      logger.error('Error unfollowing user:', error)
      alert('Failed to unfollow user. Please try again.')
    }
  }

  const renderUserCard = (user: UserSearchResult) => (
    <div
      key={user.id}
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
        {/* Avatar */}
        <div
          onClick={() => router.push(`/profile/${user.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <UserAvatar
            profileImageUrl={user.profile_image}
            email={user.email || user.username || ''}
            size="large"
          />
        </div>

        {/* User Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => router.push(`/profile/${user.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              marginBottom: '0.25rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase'
            }}>
              {user.full_name || user.username || user.email}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              marginBottom: '0.5rem'
            }}>
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>

          {user.bio && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--foreground)',
              marginBottom: '0.75rem',
              lineHeight: '1.5'
            }}>
              {user.bio}
            </p>
          )}

          {user.location && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              marginBottom: '0.75rem'
            }}>
              📍 {user.location}
            </div>
          )}

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            marginBottom: '0.75rem'
          }}>
            {user.follower_count !== undefined && (
              <span>👥 {user.follower_count} followers</span>
            )}
            {user.collection_count !== undefined && (
              <span>📂 {user.collection_count} collections</span>
            )}
          </div>
        </div>

        {/* Follow Button */}
        <button
          onClick={() => following.has(user.id) ? handleUnfollow(user.id) : handleFollow(user.id)}
          style={{
            padding: '0.5rem 1rem',
            background: following.has(user.id) ? 'var(--muted)' : 'var(--accent)',
            color: following.has(user.id) ? 'var(--muted-foreground)' : 'white',
            border: following.has(user.id) ? '1px solid var(--border)' : 'none',
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
            if (!following.has(user.id)) {
              e.currentTarget.style.background = 'var(--accent-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (!following.has(user.id)) {
              e.currentTarget.style.background = 'var(--accent)'
            }
          }}
        >
          {following.has(user.id) ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  )

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '1rem',
        paddingTop: '5rem'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem'
          }}>
            👥 Find Friends
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)'
          }}>
            Discover and connect with other travelers
          </p>
        </div>

        {/* Search Bar */}
        <div style={{
          marginBottom: '2rem',
          position: 'relative'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) {
                setActiveTab('search')
              }
            }}
            placeholder="Search by username or name..."
            style={{
              width: '100%',
              padding: '1rem',
              paddingLeft: '3rem',
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
          <span style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.25rem'
          }}>
            🔍
          </span>
          {loading && (
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)'
            }}>
              <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
            </div>
          )}
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
            onClick={() => setActiveTab('suggestions')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'suggestions' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'suggestions' ? 'white' : 'var(--foreground)',
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
            ✨ Suggested
          </button>
          <button
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'search' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'search' ? 'white' : 'var(--foreground)',
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
            🔍 Search Results
          </button>
        </div>

        {/* Content */}
        {activeTab === 'search' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {searchQuery && searchResults.length === 0 && !loading && (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  No Results Found
                </h3>
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  Try searching with a different username or name
                </p>
              </div>
            )}

            {!searchQuery && (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--border)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  Search for Friends
                </h3>
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  Enter a username or name to find people
                </p>
              </div>
            )}

            {searchResults.map(renderUserCard)}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {loadingSuggestions ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--muted-foreground)' }}>Loading suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div style={{
                padding: '3rem',
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
                  No Suggestions Yet
                </h3>
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  Check back later for personalized suggestions
                </p>
              </div>
            ) : (
              suggestions.map(renderUserCard)
            )}
          </div>
        )}
      </div>
    </>
  )
}
