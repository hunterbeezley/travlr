import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a safe storage adapter that works on both client and server
const browserStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
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