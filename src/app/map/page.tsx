'use client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import Map from '@/components/Map'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Verify authentication state before showing Auth screen
  // This prevents premature Auth display on page load
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        logger.log('Auth check - session exists:', !!session)

        // Give useAuth hook a moment to initialize if session exists
        if (session && !user && !loading) {
          logger.log('Session exists but user not loaded, waiting...')
          // Wait a bit for useAuth to catch up
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        setAuthChecked(true)
      } catch (error) {
        logger.error('Error checking auth state:', error)
        setAuthChecked(true)
      }
    }

    if (!authChecked) {
      checkAuthState()
    }
  }, [authChecked, user, loading])

  useEffect(() => {
    if (user && !loading) {
      // Only check for profile completion after auth loading is complete
      // and we have confirmed the profile data
      if (profile !== null && !profile?.username) {
        setShowProfileCompletion(true)
      }
    }
  }, [user, profile, loading])

  // Show loading while checking auth or while useAuth is initializing
  if (loading || !authChecked) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid var(--muted)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Only show Auth component after we've verified there's no valid session
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ maxWidth: '400px', width: '100%' }}>
            {/* App Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '3rem',
              justifyContent: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                {/* Geometric logo */}
                <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
                <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--accent)" strokeWidth="2"/>
                <circle cx="24" cy="24" r="8" fill="var(--accent)"/>
                <line x1="4" y1="4" x2="8" y2="8" stroke="var(--accent)" strokeWidth="2"/>
                <line x1="44" y1="4" x2="40" y2="8" stroke="var(--accent)" strokeWidth="2"/>
                <line x1="4" y1="44" x2="8" y2="40" stroke="var(--accent)" strokeWidth="2"/>
                <line x1="44" y1="44" x2="40" y2="40" stroke="var(--accent)" strokeWidth="2"/>
              </svg>
              <h1 style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: 'var(--color-white)',
                margin: 0,
                fontFamily: 'var(--font-display)'
              }}>
                Travlr
              </h1>
            </div>

            {/* Use the Auth component instead of hardcoded Google button */}
            <Auth />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {showProfileCompletion && (
        <ProfileCompletion
          onComplete={async () => {
            // Wait for profile to refresh before closing modal
            await refreshProfile()
            setShowProfileCompletion(false)
          }}
        />
      )}

      <Navbar />

      <main className="main-content">
        <div className="map-container-full">
          <div className="map-card-full fade-in">
            <div className="map-wrapper-full">
              <Map />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
