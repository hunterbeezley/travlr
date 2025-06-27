// src/components/Profile.tsx
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import { DatabaseService, UserStats } from '@/lib/database'

interface UserProfile {
  id: string
  username: string
  bio: string | null
  profile_image: string | null
  created_at: string
}

interface ProfileProps {
  mode: 'view' | 'edit'
  userId?: string
}

export default function Profile({ mode = 'view', userId }: ProfileProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(mode === 'edit')
  const [formData, setFormData] = useState({
    username: '',
    bio: ''
  })
  const [message, setMessage] = useState('')

  const profileUserId = userId || user?.id
  const isOwnProfile = user?.id === profileUserId

  useEffect(() => {
    if (profileUserId) {
      loadProfile()
      loadStats()
    }
  }, [profileUserId])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileUserId)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setMessage('Error loading profile')
        return
      }

      setProfile(data)
      setFormData({
        username: data.username || '',
        bio: data.bio || ''
      })
    } catch (error) {
      console.error('Profile load error:', error)
      setMessage('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!profileUserId) return
    
    const userStats = await DatabaseService.getUserStats(profileUserId)
    setStats(userStats)
  }

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return 'Username must be at least 3 characters'
    if (username.length > 20) return 'Username must be less than 20 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores'
    return null
  }

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    if (username === profile?.username) return true // Current username is always available

    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single()

    return !data // Available if no data found
  }

  const handleSave = async () => {
    if (!profile || !user) return

    setSaving(true)
    setMessage('')

    try {
      // Validate username
      const usernameError = validateUsername(formData.username)
      if (usernameError) {
        setMessage(usernameError)
        setSaving(false)
        return
      }

      // Check username availability
      const isAvailable = await checkUsernameAvailable(formData.username)
      if (!isAvailable) {
        setMessage('Username is already taken')
        setSaving(false)
        return
      }

      // Update profile
      const { error } = await supabase
        .from('users')
        .update({
          username: formData.username.toLowerCase(),
          bio: formData.bio.trim() || null
        })
        .eq('id', profile.id)

      if (error) {
        setMessage('Error updating profile: ' + error.message)
      } else {
        setMessage('Profile updated successfully!')
        setEditing(false)
        loadProfile() // Reload to get updated data
      }
    } catch (error) {
      setMessage('Error updating profile')
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUploaded = async (url: string, path: string) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_image: path })
        .eq('id', profile.id)

      if (error) {
        console.error('Error updating profile image:', error)
      } else {
        setProfile(prev => prev ? { ...prev, profile_image: path } : null)
      }
    } catch (error) {
      console.error('Image update error:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <div className="text-lg text-red-600">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            {editing && isOwnProfile ? (
              <ImageUpload
                currentImageUrl={profile.profile_image ? 
                  supabase.storage.from('travlr-images').getPublicUrl(profile.profile_image).data.publicUrl : 
                  undefined
                }
                onImageUploaded={handleImageUploaded}
                userId={profile.id}
                folder="profiles"
                className="w-32 h-32"
                placeholder="Upload profile photo"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {profile.profile_image ? (
                  <img
                    src={supabase.storage.from('travlr-images').getPublicUrl(profile.profile_image).data.publicUrl}
                    alt={`${profile.username}'s profile`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl text-gray-400">
                    {profile.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      username: e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '') 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={200}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/200 characters
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  @{profile.username}
                </h1>
                {profile.bio && (
                  <p className="text-gray-600 mb-4">{profile.bio}</p>
                )}
                <p className="text-sm text-gray-500">
                  Member since {formatDate(profile.created_at)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="mt-4 flex gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setFormData({
                          username: profile.username || '',
                          bio: profile.bio || ''
                        })
                        setMessage('')
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.collections_count}</div>
              <div className="text-sm text-gray-600">Collections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.pins_count}</div>
              <div className="text-sm text-gray-600">Pins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.followers_count}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.following_count}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.public_collections_count}</div>
              <div className="text-sm text-gray-600">Public</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">{stats.likes_received}</div>
              <div className="text-sm text-gray-600">Likes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}