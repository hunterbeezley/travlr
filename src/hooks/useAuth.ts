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
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No user record exists, create one
          console.log('No user record found, creating one...')
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: currentUser.id,
              email: currentUser.email, // ← Fix: use currentUser parameter
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating user record:', createError)
            return null
          }

          return newUser as UserProfile
        } else {
          console.error('Error fetching user profile:', profileError)
          return null
        }
      }

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
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const profileData = await fetchUserProfile(currentUser)
        setProfile(profileData)
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const profileData = await fetchUserProfile(currentUser)
          setProfile(profileData)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  return { user, profile, loading, refreshProfile }
}