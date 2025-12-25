'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import UserAvatar from '@/components/UserAvatar'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import { supabase } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'

interface UserProfile {
  id: string
  email?: string
  username?: string | null
  full_name?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  profile_image_url?: string | null
  profile_image_path?: string | null
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

const getDisplayName = (profile: any, user: any) => {
  if (profile?.username) return `@${profile.username}`
  if (profile?.full_name) return profile.full_name
  return user?.email || 'User'
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

  // Check if profile is incomplete and show completion modal
  useEffect(() => {
    if (user && profile && !loading) {
      const isIncomplete = !profile.username
      setShowProfileCompletion(isIncomplete)
    }
  }, [user, profile, loading])

  // Fetch collections and pins when user loads
  useEffect(() => {
    if (user && !loading) {
      fetchCollections()
      fetchPins()
    }
  }, [user, loading])

  const fetchCollections = async () => {
    if (!user) return

    setLoadingCollections(true)
    try {
      // Get collections with pin count
      const { data, error } = await supabase
        .rpc('get_user_collections_with_stats', { user_uuid: user.id })

      if (error) {
        console.error('Error fetching collections:', error)
        return
      }

      setCollections(data || [])
    } catch (error) {
      console.error('Error fetching collections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  const fetchPins = async () => {
    if (!user) return

    setLoadingPins(true)
    try {
      const pinsData = await DatabaseService.getUserPins(user.id)
      setPins(pinsData || [])
    } catch (error) {
      console.error('Error fetching pins:', error)
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
        console.error('Failed to create collection:', result.error)
      }
    } catch (error) {
      console.error('Error creating collection:', error)
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
      const { error } = await supabase
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

      if (error) throw error

      await refreshProfile()
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
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

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ maxWidth: '400px', width: '100%' }}>
            {/* App Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '3rem',
              justifyContent: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                {/* Geometric logo */}
                <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
                <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
                <circle cx="24" cy="24" r="8" fill="var(--color-red)"/>
                <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
              </svg>
              <h1 style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: 'var(--color-white)',
                margin: 0,
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Travlr
              </h1>
            </div>

            <Auth />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Profile Completion Modal */}
      {showProfileCompletion && (
        <ProfileCompletion
          onComplete={() => {
            setShowProfileCompletion(false)
            refreshProfile()
          }}
        />
      )}

      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-content">
          {/* Logo */}
          <div className="navbar-brand" style={{ cursor: 'default' }}>
            <svg width="32" height="32" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
              <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
              <circle cx="24" cy="24" r="6" fill="var(--color-red)"/>
              <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
            </svg>
            Travlr
          </div>
          
          {/* Navigation Menu */}
          <div className="navbar-nav">
            <button
              onClick={() => router.push('/')}
              className="nav-link"
            >
              MAP
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="nav-link active"
            >
              PROFILE
            </button>
          </div>

          <div className="navbar-user">
            <UserAvatar
              profileImageUrl={profile?.profile_image_url || profile?.profile_image}
              email={user.email || ''}
              size="medium"
            />
            <span className="user-email">
              {getDisplayName(profile, user)}
            </span>
            <button
              onClick={handleSignOut}
              className="btn btn-destructive btn-small"
              title="Sign out"
            >
              EXIT
            </button>
          </div>
        </div>
      </nav>

      {/* Main Profile Content */}
      <main style={{
        paddingTop: '5rem',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          {/* Profile Header */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '2rem'
            }}>
              {/* Avatar with Upload */}
              <ProfilePictureUpload
                currentImageUrl={profile?.profile_image_url || profile?.profile_image}
                onImageUploaded={async (url, path) => {
                  // Update the profile in the database
                  try {
                    const { error } = await supabase
                      .from('users')
                      .update({
                        profile_image: url,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id)

                    if (error) {
                      console.error('Error updating profile image:', error)
                      console.error('Error details:', JSON.stringify(error, null, 2))
                      alert(`Failed to update profile: ${error.message || 'Unknown error'}`)
                      return
                    }
                    await refreshProfile()
                  } catch (error) {
                    console.error('Error updating profile image:', error)
                    alert('Failed to update profile')
                  }
                }}
                onImageDeleted={async () => {
                  // Remove the profile image from the database
                  try {
                    const { error } = await supabase
                      .from('users')
                      .update({
                        profile_image: null,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id)

                    if (error) {
                      console.error('Error deleting profile image:', error)
                      console.error('Error details:', JSON.stringify(error, null, 2))
                      alert(`Failed to delete profile: ${error.message || 'Unknown error'}`)
                      return
                    }
                    await refreshProfile()
                  } catch (error) {
                    console.error('Error deleting profile image:', error)
                    alert('Failed to delete profile')
                  }
                }}
                userId={user.id}
                userInitials={user.email?.split('@')[0].slice(0, 2).toUpperCase() || 'US'}
              />

              {/* Profile Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <h1 style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      margin: 0,
                      marginBottom: '0.5rem'
                    }}>
                      {profile?.full_name || 'Anonymous User'}
                    </h1>
                    <p style={{
                      fontSize: '1.125rem',
                      color: 'var(--muted-foreground)',
                      margin: 0
                    }}>
                      {profile?.username ? `@${profile.username}` : 'No username set'}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent)'
                    }}
                  >
                    {isEditing ? '[CANCEL]' : 'EDIT PROFILE'}
                  </button>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--color-red)', fontWeight: '700' }}>[LOC]</span>
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile?.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>[WEB]</span>
                          <a 
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>[EMAIL]</span>
                        <span>{user.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>[DATE]</span>
                        <span>Joined {new Date(profile?.created_at || '').toLocaleDateString()}</span>
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
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            full_name: e.target.value
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

          {/* Collections and Pins Sections */}
          <div style={{
            display: 'grid',
            gap: '2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
          }}>
            {/* Collections */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              minHeight: '400px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📂</span>
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
                    padding: '0.5rem 1rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent)'
                  }}
                >
                  ➕ New Collection
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
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--muted-foreground)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    No Collections Yet
                  </h4>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Create your first collection to organize your pins
                  </p>
                  <button
                    onClick={() => setShowCreateCollection(true)}
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
                    ➕ Create Collection
                  </button>
                </div>
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
                            fontSize: '1.5rem',
                            flexShrink: 0
                          }}>
                            📂
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
                            <span>[PIN] {collection.pin_count || 0} pins</span>
                            <span>[DATE] {new Date(collection.created_at).toLocaleDateString()}</span>
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
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              minHeight: '400px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>[PIN]</span>
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
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>[PIN]</div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    No Pins Yet
                  </h4>
                  <p style={{ marginBottom: '1.5rem' }}>
                    Go to the map and start adding pins to your collections
                  </p>
                  <button
                    onClick={() => router.push('/')}
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
                    GO TO MAP
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
                            fontSize: '1.5rem',
                            flexShrink: 0
                          }}>
                            [PIN]
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
                            {pin.category && (
                              <span>[TAG] {pin.category}</span>
                            )}
                            <span>[DATE] {new Date(pin.created_at).toLocaleDateString()}</span>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(39, 39, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📂 Create New Collection
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
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: createCollectionLoading ? 'var(--muted)' : 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: createCollectionLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
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