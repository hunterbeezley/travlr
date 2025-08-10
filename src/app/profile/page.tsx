'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import UserAvatar from '@/components/UserAvatar'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import { supabase } from '@/lib/supabase'

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
              gap: '0.5rem',
              marginBottom: '2rem',
              justifyContent: 'center'
            }}>
              <svg width="40" height="40" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
                <circle 
                  cx="200" 
                  cy="150" 
                  r="45" 
                  fill="none" 
                  stroke="#EA8B47" 
                  strokeWidth="4"
                />
                <circle 
                  cx="200" 
                  cy="150" 
                  r="15" 
                  fill="#EA8B47"
                />
              </svg>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="30" height="30" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
              <circle 
                cx="200" 
                cy="150" 
                r="45" 
                fill="none" 
                stroke="#EA8B47" 
                strokeWidth="6"
              />
              <circle 
                cx="200" 
                cy="150" 
                r="15" 
                fill="#EA8B47"
              />
            </svg>
            <span style={{ color: '#EA8B47', fontWeight: '700', fontSize: '1.5rem' }}>
              Travlr
            </span>
          </div>
          
          {/* Navigation Menu */}
          <div className="navbar-nav">
            <button
              onClick={() => router.push('/')}
              className="nav-link"
            >
              🗺️ Map
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="nav-link active"
            >
              👤 Profile
            </button>
          </div>

          <div className="navbar-user">
            <UserAvatar
              profileImageUrl={profile?.profile_image_url}
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
              🚪 Sign out
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
              {/* Avatar */}
              <UserAvatar
                profileImageUrl={profile?.profile_image_url}
                email={user.email || ''}
                size="large"
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
                    {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>📍</span>
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile?.website && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>🔗</span>
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
                        <span>📧</span>
                        <span>{user.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📅</span>
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

          {/* Coming Soon Sections */}
          <div style={{
            display: 'grid',
            gap: '2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
          }}>
            {/* Collections */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                My Collections
              </h3>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Your saved collections will appear here
              </p>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)'
              }}>
                Coming Soon
              </div>
            </div>

            {/* Pins */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                My Pins
              </h3>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                Your saved pins will appear here
              </p>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)'
              }}>
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}