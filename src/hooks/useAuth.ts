import { logger } from '@/lib/logger'
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
  profile_image?: string | null
  preferences?: any // JSONB field for user preferences
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

  // Cache profile data to avoid unnecessary refetches
  const profileCache = useState<Map<string, { profile: UserProfile, timestamp: number }>>(new Map())[0]
  const CACHE_DURATION = 60000 // 1 minute cache

  const fetchUserProfile = async (currentUser: User, forceRefresh = false): Promise<UserProfile | null> => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = profileCache.get(currentUser.id)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          logger.log('Using cached profile')
          return cached.profile
        }
      }

      logger.log('Fetching profile for user:', currentUser.id)

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, email, username, full_name, bio, location, website, profile_image, preferences, created_at, updated_at')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        logger.log('Profile fetch error:', profileError.code, profileError.message)
        logger.log('Full profile error:', JSON.stringify(profileError, null, 2))
        logger.log('Attempted to fetch profile for user ID:', currentUser.id)

        if (profileError.code === 'PGRST116') {
          // User record doesn't exist - this shouldn't happen with the trigger
          // but handle gracefully by returning null and letting the app continue
          logger.warn('No user profile found. Profile will be created on next signup or needs manual creation.')
          logger.log('Checking if user row exists in users table...')

          // Try to check if the user exists
          const { data: checkData, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', currentUser.id)
            .maybeSingle()

          logger.log('User exists check:', { exists: !!checkData, checkError })
          return null
        }

        logger.error('Error fetching user profile:', profileError)
        return null
      }

      logger.log('Profile fetched successfully')
      const profile = profileData as UserProfile

      // Update cache
      profileCache.set(currentUser.id, { profile, timestamp: Date.now() })

      return profile
    } catch (error) {
      logger.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user, true) // Force refresh
      setProfile(profileData)
    }
  }

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        logger.log('Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          logger.error('Session error:', error)
          // If it's a refresh token error, clear the session
          if (error.message.includes('refresh_token_not_found') ||
              error.message.includes('Invalid Refresh Token')) {
            logger.log('Clearing invalid session...')
            await supabase.auth.signOut()
          }

          // Set loading to false even on error
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        if (!mounted) return

        const currentUser = session?.user ?? null
        logger.log('Current user:', currentUser?.id || 'none')

        // If no session, immediately set loading to false
        if (!currentUser) {
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
          return
        }

        // Fetch profile with a timeout to prevent hanging
        const profilePromise = fetchUserProfile(currentUser)
        const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
          setTimeout(() => {
            logger.warn('Profile fetch timeout after 3 seconds, continuing anyway')
            resolve(null)
          }, 3000)
        })

        const profileData = await Promise.race([profilePromise, timeoutPromise])

        if (mounted) {
          setUser(currentUser)
          setProfile(profileData)
          logger.log('Setting loading to false - user and profile ready (or timed out)')
          setLoading(false)
        }
      } catch (error) {
        logger.error('Error in getSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Safety timeout - ensure loading is set to false after 5 seconds max
    const timeout = setTimeout(() => {
      if (mounted) {
        logger.warn('Loading timeout - forcing loading to false')
        setLoading(false)
      }
    }, 5000)

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('Auth state changed:', event)
        if (!mounted) return

        const currentUser = session?.user ?? null

        if (currentUser) {
          // Fetch profile with a timeout to prevent hanging
          const profilePromise = fetchUserProfile(currentUser)
          const timeoutPromise = new Promise<UserProfile | null>((resolve) => {
            setTimeout(() => {
              logger.warn('Profile fetch timeout after 3 seconds, continuing anyway')
              resolve(null)
            }, 3000)
          })

          const profileData = await Promise.race([profilePromise, timeoutPromise])

          if (mounted) {
            setUser(currentUser)
            setProfile(profileData)
            setLoading(false)
          }
        } else {
          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      }
    )

    // Periodic session refresh to prevent expiration (every 5 minutes)
    // Supabase sessions expire after 1 hour by default
    const refreshInterval = setInterval(async () => {
      if (!mounted) return

      logger.log('Auto-refreshing session to prevent expiration...')
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        logger.error('Auto session refresh failed:', error)
        // If refresh token is invalid, sign out to clear the bad session
        if (error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')) {
          logger.log('Invalid refresh token detected, signing out...')
          await supabase.auth.signOut()
          if (mounted) {
            setUser(null)
            setProfile(null)
          }
        }
      } else {
        logger.log('Session auto-refreshed successfully')
        // Update user if session was refreshed
        if (mounted && data.session) {
          setUser(data.session.user)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      mounted = false
      clearTimeout(timeout)
      clearInterval(refreshInterval)
      subscription?.unsubscribe()
    }
  }, [])

  return { user, profile, loading, refreshProfile }
}