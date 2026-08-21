'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import UserAvatar from '@/components/UserAvatar'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import Navbar from '@/components/Navbar'
import EmptyState from '@/components/EmptyState'
import { supabase } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'
import { logger } from '@/lib/logger'
import { FolderOpen, Folder, MapPin, Link2, Mail, Calendar, Bookmark, ChartBar, ThumbsUp, ThumbsDown } from 'lucide-react'
import { getCategoryIcon } from '@/lib/categoryIcons'

interface UserProfile {
  id: string
  email?: string
  username?: string | null
  full_name?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  profile_image?: string | null
  created_at: string
  updated_at?: string
}

interface Collection {
  id: string
  title: string
  description?: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  pin_count?: number
  first_pin_image?: string | null
  upvotes?: number
  downvotes?: number
  net_score?: number
}

interface Pin {
  id: string
  title: string
  description?: string | null
  latitude: number
  longitude: number
  image_url?: string | null
  category?: string | null
  created_at: string
  user_id: string
  collection_id: string
}

// Helper function to get display name
const getDisplayName = (profile: UserProfile | null): string => {
  if (profile?.full_name) return profile.full_name
  if (profile?.username) return profile.username
  // Generate anonymous name based on user ID
  if (profile?.id) {
    const shortId = profile.id.slice(0, 8)
    return `anon${shortId}`
  }
  return 'Anonymous User'
}

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    location: '',
    website: ''
  })
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [collections, setCollections] = useState<Collection[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [loadingPins, setLoadingPins] = useState(true)
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [newCollectionForm, setNewCollectionForm] = useState({
    title: '',
    description: '',
    is_public: false
  })
  const [createCollectionLoading, setCreateCollectionLoading] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || ''
      })
    }
  }, [profile])

  // Redirect to home if user is not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  // Check if profile is incomplete and show completion modal
  useEffect(() => {
    if (user && profile && !loading) {
      const isIncomplete = !profile.username
      setShowProfileCompletion(isIncomplete)
    }
  }, [user, profile, loading])

  // Fetch collections and pins in parallel when user loads
  useEffect(() => {
    if (user && !loading) {
      fetchUserData()
    }
  }, [user, loading])

  // Periodic session refresh to prevent expiration (every 5 minutes)
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(async () => {
      logger.log('Refreshing session to prevent expiration...')
      const { error } = await supabase.auth.refreshSession()

      if (error) {
        logger.error('Session refresh failed:', error)
      } else {
        logger.log('Session refreshed successfully')
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  // Fetch all data in parallel for better performance
  const fetchUserData = async () => {
    if (!user) return

    setLoadingCollections(true)
    setLoadingPins(true)

    try {
      // Fetch collections and pins in parallel
      const [collectionsResult, pinsResult] = await Promise.all([
        fetchCollections(),
        fetchPins()
      ])

      setCollections(collectionsResult || [])
      setPins(pinsResult || [])
    } catch (error) {
      logger.error('Error fetching user data:', error)
    } finally {
      setLoadingCollections(false)
      setLoadingPins(false)
    }
  }

  const fetchCollections = async (retryCount = 0): Promise<Collection[]> => {
    if (!user) return []

    try {
      // Check if session is still valid, refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        logger.error('Session invalid, attempting refresh...')
        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          logger.error('Session refresh failed:', {
            message: refreshError.message,
            status: refreshError.status
          })
          // Session expired, user needs to log in again
          if (retryCount === 0) {
            return fetchCollections(1) // Retry once after refresh
          }
          return []
        }
      }

      // Try using the optimized RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_collections_with_stats', { user_uuid: user.id })

      if (rpcError) {
        logger.log('RPC function not available, using fallback query')
        // This is expected if the RPC function doesn't exist, not an error
      }

      if (!rpcError && rpcData) {
        return rpcData
      }

      // Fallback to manual query if RPC doesn't exist
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          title,
          description,
          is_public,
          created_at,
          updated_at,
          pins:pins(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        logger.error('Error loading collections:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return []
      }

      // Transform the data to match expected format
      return (data || []).map(collection => ({
        ...collection,
        pin_count: Array.isArray(collection.pins) ? collection.pins.length : 0,
        first_pin_image: null
      }))
    } catch (error: any) {
      logger.error('Error loading collections:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        stack: error?.stack
      })
      return []
    }
  }

  const fetchPins = async (): Promise<Pin[]> => {
    if (!user) return []

    try {
      const pinsData = await DatabaseService.getUserPins(user.id)
      return pinsData || []
    } catch (error) {
      logger.error('Error fetching pins:', error)
      return []
    } finally {
      setLoadingPins(false)
    }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newCollectionForm.title.trim()) return

    setCreateCollectionLoading(true)
    try {
      const result = await DatabaseService.createCollection(
        user.id,
        newCollectionForm.title.trim(),
        newCollectionForm.description.trim() || undefined,
        newCollectionForm.is_public
      )

      if (result.success) {
        setShowCreateCollection(false)
        setNewCollectionForm({ title: '', description: '', is_public: false })
        fetchCollections() // Refresh collections
      } else {
        logger.error('Failed to create collection:', result.error)
      }
    } catch (error) {
      logger.error('Error creating collection:', error)
    } finally {
      setCreateCollectionLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setUpdateLoading(true)
    setUpdateError('')

    try {
      logger.log('Updating profile with data:', {
        username: editForm.username.trim(),
        full_name: editForm.full_name.trim() || null,
        bio: editForm.bio.trim() || null,
        location: editForm.location.trim() || null,
        website: editForm.website.trim() || null,
      })

      const { data, error } = await supabase
        .from('users')
        .update({
          username: editForm.username.trim(),
          full_name: editForm.full_name.trim() || null,
          bio: editForm.bio.trim() || null,
          location: editForm.location.trim() || null,
          website: editForm.website.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      logger.log('Update result:', { data, error })

      if (error) throw error

      logger.log('Refreshing profile...')
      await refreshProfile()
      logger.log('Profile refreshed, closing edit mode')
      setIsEditing(false)
    } catch (error: any) {
      logger.error('Error updating profile:', error)
      setUpdateError(error.message || 'Failed to update profile')
    } finally {
      setUpdateLoading(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div className="spinner" style={{ 
            width: '2rem', 
            height: '2rem',
            margin: '0 auto 1rem'
          }} />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading state if user is not logged in (redirect happens in useEffect)
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div className="spinner" style={{
            width: '2rem',
            height: '2rem',
            margin: '0 auto 1rem'
          }} />
          <p>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Profile Completion Modal */}
      {showProfileCompletion && (
        <ProfileCompletion
          onComplete={async () => {
            // Wait for profile to refresh before closing modal
            await refreshProfile()
            setShowProfileCompletion(false)
          }}
        />
      )}

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Profile Content */}
      <main style={{
        paddingTop: '5rem',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div className="profile-container-wrapper" style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          {/* Profile Header */}
          <div className="profile-header-card" style={{
            background: 'var(--card-elevated)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow)'
          }}>
            <div className="profile-header-content" style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '2rem'
            }}>
              {/* Avatar with Upload */}
              <ProfilePictureUpload
                currentImageUrl={profile?.profile_image}
                onImageUploaded={async (url) => {
                  // Update the profile in the database
                  try {
                    logger.log('=== Avatar Upload Start ===')
                    logger.log('User ID:', user.id)
                    logger.log('Image URL:', url)

                    // Check session first
                    const { data: { session } } = await supabase.auth.getSession()
                    logger.log('Session exists:', !!session)
                    logger.log('Session user ID:', session?.user?.id)
                    logger.log('User ID matches session:', user.id === session?.user?.id)

                    // Try update without .single() first to see if any rows are affected
                    const { data, error, count } = await supabase
                      .from('users')
                      .update({
                        profile_image: url,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id)
                      .select()

                    logger.log('Update result:', { data, error, count, rowCount: data?.length })

                    if (error) {
                      logger.error('Error updating profile image:', error)
                      logger.error('Error details:', JSON.stringify(error, null, 2))
                      alert(`Failed to update profile: ${error.message || 'Unknown error'}`)
                      return
                    }

                    if (!data || data.length === 0) {
                      logger.error('Update returned 0 rows - RLS or user ID mismatch?')
                      alert('Failed to update profile: No rows updated. Check console for details.')
                      return
                    }

                    logger.log('Avatar updated successfully, refreshing profile...')
                    await refreshProfile()
                    logger.log('Profile refreshed')
                  } catch (error) {
                    logger.error('Error updating profile image:', error)
                    alert('Failed to update profile')
                  }
                }}
                onImageDeleted={async () => {
                  // Remove the profile image from the database
                  try {
                    logger.log('Deleting avatar from database...')
                    const { data, error } = await supabase
                      .from('users')
                      .update({
                        profile_image: null,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id)
                      .select()
                      .single()

                    logger.log('Avatar delete result:', { data, error })

                    if (error) {
                      logger.error('Error deleting profile image:', error)
                      logger.error('Error details:', JSON.stringify(error, null, 2))
                      alert(`Failed to delete profile: ${error.message || 'Unknown error'}`)
                      return
                    }

                    logger.log('Avatar deleted successfully, refreshing profile...')
                    await refreshProfile()
                    logger.log('Profile refreshed')
                  } catch (error) {
                    logger.error('Error deleting profile image:', error)
                    alert('Failed to delete profile')
                  }
                }}
                userId={user.id}
                userInitials={user.email?.split('@')[0].slice(0, 2).toUpperCase() || 'US'}
              />

              {/* Profile Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="profile-title-section" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  gap: '1rem'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      margin: 0,
                      marginBottom: '0.5rem',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {getDisplayName(profile)}
                    </h1>
                    <p style={{
                      fontSize: '1.125rem',
                      color: 'var(--muted-foreground)',
                      margin: 0,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {profile?.username ? `@${profile.username}` : profile?.email || 'No username set'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="profile-edit-btn"
                      style={{
                        padding: '0.625rem 1.25rem',
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--accent)'
                      }}
                    >
                      {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="profile-logout-btn"
                      style={{
                        padding: '0.625rem 1.25rem',
                        background: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                        border: 'none',
                        borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--destructive)'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--muted)'
                        e.currentTarget.style.color = 'var(--muted-foreground)'
                      }}
                      title="Sign out of your account"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* Profile Details */}
                {!isEditing ? (
                  <div>
                    {profile?.bio && (
                      <p style={{
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        marginBottom: '1rem',
                        color: 'var(--foreground)'
                      }}>
                        {profile.bio}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--muted-foreground)'
                    }}>
                      {profile?.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
                          <MapPin size={14} strokeWidth={2} /> {profile.location}
                        </div>
                      )}
                      {profile?.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Link2 size={14} strokeWidth={2} /> <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--accent)',
                              textDecoration: 'none'
                            }}
                          >
                            {profile.website}
                          </a>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Mail size={14} strokeWidth={2} /> {user.email}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} strokeWidth={2} /> Joined {new Date(profile?.created_at || '').toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <form onSubmit={handleEditSubmit}>
                    {updateError && (
                      <div style={{
                        padding: '0.75rem',
                        background: 'var(--destructive)',
                        color: 'white',
                        borderRadius: 'var(--radius)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                      }}>
                        {updateError}
                      </div>
                    )}

                    <div style={{
                      display: 'grid',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          marginBottom: '0.5rem'
                        }}>
                          Username *
                        </label>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                          }))}
                          required
                          maxLength={30}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            background: 'var(--background)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          marginBottom: '0.5rem'
                        }}>
                          Full Name <span style={{ color: 'var(--muted-foreground)', fontWeight: '400' }}>(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            full_name: e.target.value
                          }))}
                          maxLength={100}
                          placeholder="Leave blank for anonymous username"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            background: 'var(--background)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          marginBottom: '0.5rem'
                        }}>
                          Bio
                        </label>
                        <textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            bio: e.target.value
                          }))}
                          maxLength={200}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            background: 'var(--background)',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted-foreground)',
                          marginTop: '0.25rem'
                        }}>
                          {editForm.bio.length}/200 characters
                        </div>
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          marginBottom: '0.5rem'
                        }}>
                          Location
                        </label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            location: e.target.value
                          }))}
                          maxLength={100}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            background: 'var(--background)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          marginBottom: '0.5rem'
                        }}>
                          Website
                        </label>
                        <input
                          type="url"
                          value={editForm.website}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            website: e.target.value
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            background: 'var(--background)'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <button
                        type="submit"
                        disabled={updateLoading || !editForm.username.trim()}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: updateLoading ? 'var(--muted)' : 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: updateLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'var(--transition)'
                        }}
                      >
                        {updateLoading ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <div className="spinner" style={{
                              width: '1rem',
                              height: '1rem'
                            }} />
                            Saving...
                          </div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          setUpdateError('')
                          // Reset form to current profile data
                          if (profile) {
                            setEditForm({
                              username: profile.username || '',
                              full_name: profile.full_name || '',
                              bio: profile.bio || '',
                              location: profile.location || '',
                              website: profile.website || ''
                            })
                          }
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'var(--muted)',
                          color: 'var(--foreground)',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'var(--transition)'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={() => router.push('/saved')}
              style={{
                padding: '1.25rem',
                background: 'var(--card-elevated)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--foreground)',
                fontWeight: '500',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <Bookmark size={24} strokeWidth={2} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1rem', fontWeight: '600' }}>Saved</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  Your saved collections
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/analytics')}
              style={{
                padding: '1.25rem',
                background: 'var(--card-elevated)',
                border: 'none',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--foreground)',
                fontWeight: '500',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <ChartBar size={24} strokeWidth={2} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1rem', fontWeight: '600' }}>Analytics</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  View your stats
                </div>
              </div>
            </button>
          </div>

          {/* Collections and Pins Sections */}
          <div className="profile-sections-grid" style={{
            display: 'grid',
            gap: '2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))'
          }}>
            {/* Collections - minWidth:0 overrides the grid item's default
                min-width:auto, which otherwise lets wide unshrinkable content
                (e.g. the stats row below) force this track past the viewport
                even though gridTemplateColumns caps it at 100%. */}
            <div style={{
              minWidth: 0,
              background: 'var(--card-elevated)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              minHeight: '400px',
              boxShadow: 'var(--shadow)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Folder size={22} strokeWidth={2} color="var(--accent)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                    My Collections
                  </h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                    background: 'var(--muted)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    fontWeight: '500'
                  }}>
                    {collections.length}
                  </span>
                </div>
                
                <button
                  onClick={() => setShowCreateCollection(true)}
                  style={{
                    padding: '0.625rem 1rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent)'
                  }}
                >
                  + New
                </button>
              </div>

              {loadingCollections ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '200px',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
                  <p style={{ color: 'var(--muted-foreground)' }}>Loading collections...</p>
                </div>
              ) : collections.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No Collections Yet"
                  description="Create your first collection to organize your pins and share your favorite places."
                  actionLabel="Create Collection"
                  onAction={() => setShowCreateCollection(true)}
                  variant="subtle"
                />
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      onClick={() => router.push(`/collections/${collection.id}`)}
                      style={{
                        padding: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--background)',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}>
                        {collection.first_pin_image ? (
                          <img
                            src={collection.first_pin_image}
                            alt={collection.title}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: 'var(--radius)',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius)',
                            background: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Folder size={22} strokeWidth={2} color="var(--muted-foreground)" />
                          </div>
                        )}
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <h4 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {collection.title}
                            </h4>
                            {collection.is_public && (
                              <span style={{
                                fontSize: '0.75rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#22c55e',
                                padding: '0.125rem 0.375rem',
                                borderRadius: 'var(--radius)',
                                fontWeight: '500'
                              }}>
                                Public
                              </span>
                            )}
                          </div>
                          
                          {collection.description && (
                            <p style={{
                              fontSize: '0.875rem',
                              color: 'var(--muted-foreground)',
                              margin: '0 0 0.5rem 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {collection.description}
                            </p>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '0.75rem',
                            color: 'var(--muted-foreground)'
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} strokeWidth={2} /> {collection.pin_count || 0} pins
                            </span>
                            {collection.net_score !== undefined && collection.net_score !== 0 && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: collection.net_score > 0 ? '#22c55e' : '#ef4444',
                                fontWeight: '600'
                              }}>
                                {collection.net_score > 0 ? <ThumbsUp size={12} strokeWidth={2} /> : <ThumbsDown size={12} strokeWidth={2} />} {collection.net_score > 0 ? '+' : ''}{collection.net_score}
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} strokeWidth={2} /> {new Date(collection.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pins */}
            <div style={{
              minWidth: 0,
              background: 'var(--card-elevated)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              minHeight: '400px',
              boxShadow: 'var(--shadow)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <MapPin size={22} strokeWidth={2} color="var(--accent)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                  My Pins
                </h3>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  background: 'var(--muted)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius)',
                  fontWeight: '500'
                }}>
                  {pins.length}
                </span>
              </div>

              {loadingPins ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '200px',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
                  <p style={{ color: 'var(--muted-foreground)' }}>Loading pins...</p>
                </div>
              ) : pins.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--muted-foreground)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <MapPin size={48} strokeWidth={1.5} />
                  </div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    No Pins Yet
                  </h4>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Go to the map and start adding pins to your collections
                  </p>
                  <button
                    onClick={() => router.push('/map')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Go to Map
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {pins.slice(0, 10).map((pin) => (
                    <div
                      key={pin.id}
                      onClick={() => router.push(`/pins/${pin.id}`)}
                      style={{
                        padding: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--background)',
                        transition: 'var(--transition)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}>
                        {pin.image_url ? (
                          <img
                            src={pin.image_url}
                            alt={pin.title}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: 'var(--radius)',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius)',
                            background: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {(() => {
                              const CategoryIcon = getCategoryIcon(pin.category)
                              return <CategoryIcon size={22} strokeWidth={2} color="var(--muted-foreground)" />
                            })()}
                          </div>
                        )}
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            margin: '0 0 0.25rem 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {pin.title}
                          </h4>
                          
                          {pin.description && (
                            <p style={{
                              fontSize: '0.875rem',
                              color: 'var(--muted-foreground)',
                              margin: '0 0 0.5rem 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {pin.description}
                            </p>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '0.75rem',
                            color: 'var(--muted-foreground)'
                          }}>
                            {pin.category && (() => {
                              const CategoryIcon = getCategoryIcon(pin.category)
                              return (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CategoryIcon size={12} strokeWidth={2} /> {pin.category}
                                </span>
                              )
                            })()}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} strokeWidth={2} /> {new Date(pin.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pins.length > 10 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '1rem',
                      color: 'var(--muted-foreground)',
                      fontSize: '0.875rem'
                    }}>
                      ... and {pins.length - 10} more pins
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-elevated)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '1.5rem'
            }}>
              Create New Collection
            </h3>

            <form onSubmit={handleCreateCollection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newCollectionForm.title}
                  onChange={(e) => setNewCollectionForm(prev => ({
                    ...prev,
                    title: e.target.value
                  }))}
                  required
                  maxLength={100}
                  placeholder="e.g., Tokyo Food Tour"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    background: 'var(--background)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem'
                }}>
                  Description
                </label>
                <textarea
                  value={newCollectionForm.description}
                  onChange={(e) => setNewCollectionForm(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  maxLength={200}
                  rows={3}
                  placeholder="Describe your collection..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    background: 'var(--background)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={newCollectionForm.is_public}
                    onChange={(e) => setNewCollectionForm(prev => ({
                      ...prev,
                      is_public: e.target.checked
                    }))}
                    style={{
                      width: '1rem',
                      height: '1rem'
                    }}
                  />
                  Make this collection public
                </label>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  marginTop: '0.25rem',
                  marginLeft: '1.5rem'
                }}>
                  Public collections can be discovered by other users
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCollection(false)
                    setNewCollectionForm({ title: '', description: '', is_public: false })
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createCollectionLoading || !newCollectionForm.title.trim()}
                  className="btn btn-primary"
                  style={{
                    width: '100%'
                  }}
                >
                  {createCollectionLoading ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <div className="spinner" style={{
                        width: '1rem',
                        height: '1rem'
                      }} />
                      Creating...
                    </div>
                  ) : (
                    'Create Collection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}