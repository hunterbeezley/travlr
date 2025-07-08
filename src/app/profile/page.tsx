'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProfilePictureUpload from '@/components/ProfilePictureUpload'
import UserAvatar from '@/components/UserAvatar'

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

interface UserStats {
  collections_count: number
  public_collections_count: number
  pins_count: number
  followers_count: number
  following_count: number
  likes_received: number
}

const getDisplayName = (profile: any, user: any) => {
  if (profile?.username) return `@${profile.username}`
  if (profile?.full_name) return profile.full_name
  return user?.email || 'User'
}

export default function ProfilePage() {
  const { user, profile: authProfile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Complete form state with all fields
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    location: '',
    website: ''
  })

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const showSuccessMessage = (message: string) => {
    // You can implement a toast notification here
    alert(message) // Simple alert for now
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const fetchProfile = async () => {
    if (!user) return

    try {
      setProfileLoading(true)
      setError(null)
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No user record exists, create one
          console.log('No user record found, creating one...')
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating user record:', createError)
            setError(`Failed to create user profile: ${createError.message}`)
            return
          }

          setProfile(newUser)
          setFormData({
            username: '',
            full_name: '',
            bio: '',
            location: '',
            website: ''
          })
        } else {
          console.error('Error fetching profile:', profileError)
          setError(`Failed to load profile: ${profileError.message}`)
          return
        }
      } else {
        setProfile(profileData)
        setFormData({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || ''
        })
      }

      // Try to get user stats
      try {
        const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
          user_uuid: user.id
        })

        if (!statsError && statsData) {
          setStats(statsData)
        }
      } catch (error) {
        console.log('Stats function not available yet')
      }

    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('An unexpected error occurred while loading your profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleProfileImageUpload = async (imageUrl: string, imagePath: string) => {
    if (!user) return

    try {
      // Update the database with the new profile image
      const { error } = await supabase
        .from('users')
        .update({
          profile_image_url: imageUrl,
          profile_image_path: imagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile image in database:', error)
        alert('Failed to save profile image to database')
        return
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        profile_image_url: imageUrl,
        profile_image_path: imagePath
      } : null)

      // Refresh the auth context so navbar updates immediately
      await refreshProfile()

      // Show success message
      showSuccessMessage('Profile picture updated successfully!')

    } catch (error) {
      console.error('Error updating profile image:', error)
      alert('Failed to update profile image')
    }
  }

  const handleProfileImageDelete = async () => {
    if (!user) return

    try {
      // Update the database to remove the profile image
      const { error } = await supabase
        .from('users')
        .update({
          profile_image_url: null,
          profile_image_path: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error removing profile image from database:', error)
        alert('Failed to remove profile image from database')
        return
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        profile_image_url: null,
        profile_image_path: null
      } : null)

      // Refresh the auth context so navbar updates immediately
      await refreshProfile()

      showSuccessMessage('Profile picture removed successfully!')

    } catch (error) {
      console.error('Error removing profile image:', error)
      alert('Failed to remove profile image')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || updateLoading) return

    try {
      setUpdateLoading(true)
      setError(null)

      // Prepare update data - only include non-empty values or explicitly null for empty strings
      const updateData: any = {
        username: formData.username.trim() || null,
        full_name: formData.full_name.trim() || null,
        bio: formData.bio.trim() || null,
        location: formData.location.trim() || null,
        website: formData.website.trim() || null,
        updated_at: new Date().toISOString()
      }

      console.log('Updating profile with:', updateData)

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        setError(`Update failed: ${error.message}`)
        return
      }

      // Refresh profile data
      await fetchProfile()
      setIsEditing(false)
      
      showSuccessMessage('Profile updated successfully!')

    } catch (error) {
      console.error('Error updating profile:', error)
      setError('An unexpected error occurred while updating your profile.')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid var(--muted)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
              {/* Outer circle */}
              <circle 
                cx="200" 
                cy="150" 
                r="45" 
                fill="none" 
                stroke="#EA8B47" 
                strokeWidth="6"
              />
              {/* Inner orange dot */}
              <circle 
                cx="200" 
                cy="150" 
                r="15" 
                fill="#EA8B47"
              />
            </svg>
            <h1 style={{
              fontSize: '1.5rem',
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
              profileImageUrl={authProfile?.profile_image_url}
              email={user.email || ''}
              size="medium"
            />
            <span className="user-email">
              {getDisplayName(authProfile, user)}
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

      <main className="main-content">
        <div className="profile-container">
          
          {/* Error Display */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
              color: '#dc2626'
            }}>
              <strong>Error:</strong> {error}
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <a href="/debug-profile" style={{ color: '#dc2626', textDecoration: 'underline' }}>
                  → Open Debug Helper
                </a>
              </div>
            </div>
          )}
          
          {/* Profile Header */}
          <div className="profile-header fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-xl)' }}>
              
              {/* Profile Picture Upload */}
              <ProfilePictureUpload
                currentImageUrl={profile?.profile_image_url}
                onImageUploaded={handleProfileImageUpload}
                onImageDeleted={handleProfileImageDelete}
                userId={user.id}
                userInitials={getUserInitials(user.email || '')}
              />

              {/* Profile Info */}
              <div className="profile-info">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>
                    {profile?.full_name || profile?.username || user.email?.split('@')[0] || 'User'}
                  </h1>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.875rem' }}
                  >
                    {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
                  </button>
                </div>

                {profile?.username && (
                  <p style={{ color: 'var(--muted-foreground)', marginBottom: 'var(--space-sm)' }}>
                    @{profile.username}
                  </p>
                )}

                {profile?.bio && (
                  <p style={{ marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                    {profile.bio}
                  </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  {profile?.location && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      📍 {profile.location}
                    </span>
                  )}
                  {profile?.website && (
                    <a 
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'var(--space-xs)', 
                        color: 'var(--accent)', 
                        textDecoration: 'none' 
                      }}
                    >
                      🔗 {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>

                {stats && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                    gap: 'var(--space-md)', 
                    marginTop: 'var(--space-lg)',
                    padding: 'var(--space-md)',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.collections_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Collections</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.pins_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Pins</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.followers_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Followers</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{stats.following_count}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Following</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <div className="edit-profile-form fade-in">
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--space-lg)' }}>
                ✏️ Edit Profile
              </h2>

              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'grid', gap: 'var(--space-lg)', maxWidth: '500px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter your username"
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Enter your full name"
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Where are you located?"
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: 'var(--space-xs)' }}>
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                      style={{
                        width: '100%',
                        padding: 'var(--space-sm)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn"
                      style={{
                        background: 'var(--muted)',
                        color: 'var(--foreground)',
                        flex: 1
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {updateLoading ? 'Updating...' : '💾 Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Account Info */}
          <div className="account-info fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--space-lg)' }}>
              ⚙️ Account Information
            </h2>

            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <div className="info-item">
                <span className="info-label">Email Address:</span>
                <span className="info-value">{user.email}</span>
              </div>

              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value mono">{user.id}</span>
              </div>

              {profile?.created_at && (
                <div className="info-item">
                  <span className="info-label">Account Created:</span>
                  <span className="info-value">{formatDate(profile.created_at)}</span>
                </div>
              )}

              {profile?.updated_at && (
                <div className="info-item">
                  <span className="info-label">Last Updated:</span>
                  <span className="info-value">{formatDate(profile.updated_at)}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}