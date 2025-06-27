'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface UserProfile {
  id: string
  email: string
  username: string | null
  bio: string | null
  profile_image: string | null
  created_at: string
}

interface ProfileCompletionProps {
  onComplete: () => void
}

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onComplete }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    bio: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  // Check if user already has a complete profile
  useEffect(() => {
    if (user) {
      checkUserProfile()
    }
  }, [user])

  const checkUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking profile:', error)
        return
      }

      if (data && data.username) {
        // Profile exists and is complete
        setProfile(data)
        onComplete()
        return
      }

      // Profile doesn't exist or is incomplete
      setProfile(data)
      setFormData({
        username: data?.username || '',
        bio: data?.bio || ''
      })
    } catch (error) {
      console.error('Error checking profile:', error)
    } finally {
      setCheckingProfile(false)
    }
  }

  const validateUsername = async (username: string): Promise<boolean> => {
    if (!username.trim()) {
      setErrors(prev => ({ ...prev, username: 'Username is required' }))
      return false
    }

    if (username.length < 3) {
      setErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters' }))
      return false
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrors(prev => ({ ...prev, username: 'Username can only contain letters, numbers, and underscores' }))
      return false
    }

    // Check if username is available (only if different from current)
    if (username !== profile?.username) {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .neq('id', user?.id)
        .single()

      if (data) {
        setErrors(prev => ({ ...prev, username: 'Username is already taken' }))
        return false
      }
    }

    setErrors(prev => ({ ...prev, username: '' }))
    return true
  }

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)
    setErrors({})

    // Validate username
    const isValidUsername = await validateUsername(formData.username)
    if (!isValidUsername) {
      setLoading(false)
      return
    }

    try {
      const updateData = {
        username: formData.username.trim(),
        bio: formData.bio.trim() || null,
        email: user.email
      }

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id)

        if (error) throw error
      } else {
        // Create new profile (shouldn't happen with trigger, but just in case)
        const { error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            ...updateData
          })

        if (error) throw error
      }

      onComplete()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setErrors({ general: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '') // Strip invalid chars
    setFormData(prev => ({ ...prev, username: value }))
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }))
    }
  }

  if (checkingProfile) {
    return (
      <div className="form-container fade-in">
        <div className="text-center">
          <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
          <p>Setting up your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="form-container slide-up">
      <div className="text-center" style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
        <h2 className="form-title">Welcome to Travlr!</h2>
        <p className="form-subtitle">
          Let's set up your profile to get started
        </p>
      </div>
      
      <div>
        <div className="form-group">
          <label htmlFor="username" style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--foreground)'
          }}>
            Username *
          </label>
          <input
            id="username"
            type="text"
            placeholder="Choose a unique username"
            value={formData.username}
            onChange={handleUsernameChange}
            className={`form-input ${errors.username ? 'error' : ''}`}
            required
            disabled={loading}
            maxLength={30}
          />
          {errors.username && (
            <div style={{ 
              color: 'var(--destructive)', 
              fontSize: '0.75rem', 
              marginTop: '0.25rem' 
            }}>
              {errors.username}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="bio" style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--foreground)'
          }}>
            Bio (optional)
          </label>
          <textarea
            id="bio"
            placeholder="Tell us about yourself..."
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            className="form-input"
            disabled={loading}
            maxLength={200}
            rows={3}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--muted-foreground)', 
            marginTop: '0.25rem' 
          }}>
            {formData.bio.length}/200 characters
          </div>
        </div>

        {errors.general && (
          <div style={{ 
            color: 'var(--destructive)', 
            fontSize: '0.875rem', 
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)'
          }}>
            {errors.general}
          </div>
        )}
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !formData.username.trim()}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center gap-sm">
              <div className="spinner" style={{ width: '1rem', height: '1rem' }} />
              Setting up profile...
            </div>
          ) : (
            'Complete Profile'
          )}
        </button>
      </div>
      
      <div style={{ marginTop: '1.5rem' }} className="text-center">
        <p className="text-sm text-muted">
          You can always update your profile later in settings.
        </p>
      </div>
    </div>
  )
}

// Hook to check if user needs profile completion
export const useProfileCompletion = () => {
  const { user, loading: authLoading } = useAuth()
  const [needsCompletion, setNeedsCompletion] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setNeedsCompletion(false)
      setLoading(false)
      return
    }

    const checkProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking profile:', error)
          setNeedsCompletion(false)
          return
        }

        // Needs completion if no username
        setNeedsCompletion(!data?.username)
      } catch (error) {
        console.error('Error checking profile completion:', error)
        setNeedsCompletion(false)
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [user, authLoading])

  return { needsCompletion, loading }
}

export default ProfileCompletion