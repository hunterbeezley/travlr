// Temporary test component - add this to your feed page temporarily
'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuth() {
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('=== AUTH DEBUG ===')
      console.log('Session:', session)
      console.log('User:', session?.user)
      console.log('Access Token:', session?.access_token ? 'EXISTS' : 'MISSING')
      console.log('Error:', error)
      console.log('=================')
    }
    checkAuth()
  }, [])

  return null
}
