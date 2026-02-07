import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface UserPreferences {
  map_style?: string
  default_map_zoom?: number
  default_map_center?: { lat: number; lng: number }
  theme?: 'light' | 'dark'
  notifications_enabled?: boolean
  language?: string
  // Add more preferences as needed
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences
  loading: boolean
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

const DEFAULT_PREFERENCES: UserPreferences = {
  map_style: 'roadmap',
  default_map_zoom: 11,
  default_map_center: { lat: 45.5152, lng: -122.6765 }
}

// Map old Mapbox styles to new Google Maps styles
const MAP_STYLE_MIGRATION: Record<string, string> = {
  'mapbox://styles/mapbox/streets-v12': 'roadmap',
  'mapbox://styles/mapbox/satellite-v9': 'satellite',
  'mapbox://styles/mapbox/outdoors-v12': 'terrain',
  'mapbox://styles/mapbox/dark-v11': 'dark'
}

// Migrate old Mapbox style to Google Maps style
function migrateMapStyle(oldStyle?: string): string {
  if (!oldStyle) return DEFAULT_PREFERENCES.map_style!
  return MAP_STYLE_MIGRATION[oldStyle] || oldStyle
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  // Load preferences when user changes
  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES)
      setLoading(false)
      return
    }

    loadPreferences()
  }, [user])

  const loadPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading preferences:', error)
        setPreferences(DEFAULT_PREFERENCES)
        return
      }

      // Merge loaded preferences with defaults
      const loadedPrefs = data?.preferences || {}

      // Migrate map style if needed
      if (loadedPrefs.map_style) {
        loadedPrefs.map_style = migrateMapStyle(loadedPrefs.map_style)
      }

      setPreferences({ ...DEFAULT_PREFERENCES, ...loadedPrefs })
    } catch (error) {
      console.error('Error loading preferences:', error)
      setPreferences(DEFAULT_PREFERENCES)
    } finally {
      setLoading(false)
    }
  }

  // Update a single preference
  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!user) {
      console.warn('Cannot update preferences: user not logged in')
      return
    }

    try {
      const newPreferences = { ...preferences, [key]: value }

      // Optimistically update local state
      setPreferences(newPreferences)

      // Update in database
      const { error } = await supabase
        .from('users')
        .update({ preferences: newPreferences })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating preference:', error)
        // Revert on error
        setPreferences(preferences)
        return
      }

      console.log(`✅ Preference updated: ${key} = ${JSON.stringify(value)}`)
    } catch (error) {
      console.error('Error updating preference:', error)
      // Revert on error
      setPreferences(preferences)
    }
  }

  // Update multiple preferences at once
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) {
      console.warn('Cannot update preferences: user not logged in')
      return
    }

    try {
      const newPreferences = { ...preferences, ...updates }

      // Optimistically update local state
      setPreferences(newPreferences)

      // Update in database
      const { error } = await supabase
        .from('users')
        .update({ preferences: newPreferences })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating preferences:', error)
        // Revert on error
        setPreferences(preferences)
        return
      }

      console.log(`✅ Preferences updated:`, updates)
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
    }
  }

  return {
    preferences,
    loading,
    updatePreference,
    updatePreferences
  }
}
