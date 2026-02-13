import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if we're in a browser environment with valid localStorage
const hasValidLocalStorage = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function' &&
      typeof window.localStorage.removeItem === 'function'
    )
  } catch {
    return false
  }
}

// Create a safe storage adapter that works on both client and server
const browserStorage = {
  getItem: (key: string) => {
    try {
      if (!hasValidLocalStorage()) return null
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (!hasValidLocalStorage()) return
      window.localStorage.setItem(key, value)
    } catch {
      // Silently fail
    }
  },
  removeItem: (key: string) => {
    try {
      if (!hasValidLocalStorage()) return
      window.localStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: browserStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})