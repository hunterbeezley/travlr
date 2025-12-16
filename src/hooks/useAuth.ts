import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
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

interface AuthData {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

export function useAuth(): AuthData {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (currentUser: User): Promise<UserProfile | null> => {
    try {
      console.log('Fetching profile for user:', currentUser.id)

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        console.log('Profile fetch error:', profileError.code, profileError.message)

        if (profileError.code === 'PGRST116') {
          // User record doesn't exist - this shouldn't happen with the trigger
          // but handle gracefully by returning null and letting the app continue
          console.warn('No user profile found. Profile will be created on next signup or needs manual creation.')
          return null
        }

        console.error('Error fetching user profile:', profileError)
        return null
      }

      console.log('Profile fetched successfully')
      return profileData as UserProfile
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        console.log('Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
        }

        if (!mounted) return

        const currentUser = session?.user ?? null
        console.log('Current user:', currentUser?.id || 'none')
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchUserProfile(currentUser)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          if (mounted) {
            setProfile(null)
          }
        }

        if (mounted) {
          console.log('Setting loading to false')
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Safety timeout - ensure loading is set to false after 5 seconds max
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Loading timeout - forcing loading to false')
        setLoading(false)
      }
    }, 5000)

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchUserProfile(currentUser)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          if (mounted) {
            setProfile(null)
          }
        }

        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [])

  return { user, profile, loading, refreshProfile }
}