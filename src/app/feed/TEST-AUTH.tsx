'use client'
// Temporary test component - add this to your feed page temporarily
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export default function TestAuth() {
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      logger.log('=== AUTH DEBUG ===')
      logger.log('Session:', session)
      logger.log('User:', session?.user)
      logger.log('Access Token:', session?.access_token ? 'EXISTS' : 'MISSING')
      logger.log('Error:', error)
      logger.log('=================')
    }
    checkAuth()
  }, [])

  return null
}
